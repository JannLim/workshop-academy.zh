// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

// 运维流程的系统测试：以子进程运行真实的 npm 脚本入口（src/main.js 与 scripts/*.js）。

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { applyMigrations, defaultMigrationsDir, openDatabase, projectRoot, readMigrationFiles } from '../src/db.js';
import { client, login, tempDir } from './helpers.js';
import { seedIfNeeded } from '../src/seed.js';
import { hashPassword } from '../src/auth.js';

const execFileAsync = promisify(execFile);
const NODE_ARGS = ['--disable-warning=ExperimentalWarning'];

/** 复制一份项目（不含数据），在副本里演练迁移，不影响仓库本身。 */
function projectCopy(t) {
  const root = tempDir(t, 'academy-project-');
  for (const dir of ['src', 'scripts', 'migrations', 'public']) cpSync(resolve(projectRoot, dir), join(root, dir), { recursive: true });
  cpSync(resolve(projectRoot, 'package.json'), join(root, 'package.json'));
  return root;
}

function environment(t, overrides = {}) {
  return {
    ...process.env,
    DATA_DIR: tempDir(t, 'academy-data-'),
    BACKUP_DIR: tempDir(t, 'academy-backups-'),
    PORT: '0',
    INIT_CWD: '',
    ...overrides,
  };
}

/** 启动 src/main.js，等到打印出访问地址。 */
async function startServer(t, env, root = projectRoot) {
  const child = spawn(process.execPath, [...NODE_ARGS, join(root, 'src/main.js')], { cwd: root, env });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const exited = once(child, 'exit').then(([code]) => code);
  t.after(() => { if (child.exitCode === null) child.kill('SIGINT'); return exited; });
  const url = await new Promise((resolveUrl, reject) => {
    const check = () => {
      const match = /已启动：http:\/\/localhost:(\d+)/.exec(output);
      if (match) resolveUrl(`http://127.0.0.1:${match[1]}`);
    };
    child.stdout.on('data', check);
    exited.then((code) => reject(new Error(`服务提前退出（${code}）：${output}`)));
  });
  return { child, url, exited, output: () => output };
}

async function runNode(script, env, root = projectRoot, args = []) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [...NODE_ARGS, join(root, script), ...args], { cwd: root, env });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

function courseTitles(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return db.prepare('SELECT title FROM courses ORDER BY id').all().map((row) => row.title);
  } finally {
    db.close();
  }
}

test('备份会先请运行中的服务正常停止，再复制数据库', async (t) => {
  const env = environment(t);
  const server = await startServer(t, env);
  assert.match(server.output(), /示例账号/);
  const admin = client(server.url);
  await login(admin, 'admin');
  await admin.post('/api/admin/courses', {
    title: '备份前创建的课程', summary: '用来核对备份内容', instructor: '测试', level: 'beginner', videoFile: 'python-basics.mp4',
  });

  const result = await runNode('scripts/backup.js', env);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /正在请求它正常停止/);
  assert.match(result.stdout, /已备份：/);
  const { port } = new URL(server.url);
  assert.ok(result.stdout.includes(`DATA_DIR=${env.DATA_DIR} PORT=${port} npm start`), '重启提示带上原来的数据目录和端口');
  assert.equal(await server.exited, 0);
  assert.match(server.output(), /已停止，数据库已正常关闭/);
  assert.equal(existsSync(join(env.DATA_DIR, 'run.json')), false);

  const files = readdirSync(env.BACKUP_DIR);
  assert.equal(files.length, 1);
  assert.equal(files[0].match(/^academy-(.+)-\d{8}-\d{6}\.sqlite$/)?.[1], basename(env.DATA_DIR), '备份文件名带数据目录名');
  assert.ok(courseTitles(join(env.BACKUP_DIR, files[0])).includes('备份前创建的课程'));

  const again = await runNode('scripts/backup.js', env);
  assert.equal(again.code, 0, again.stderr);
  assert.match(again.stdout, /未在运行/);
  assert.equal(readdirSync(env.BACKUP_DIR).length, 2);
});

test('恢复要求服务已停止，校验快照并保留恢复前的数据库', async (t) => {
  const env = environment(t);
  const dbFile = join(env.DATA_DIR, 'academy.sqlite');
  const first = await startServer(t, env);
  await runNode('scripts/backup.js', env);
  await first.exited;
  const snapshot = join(env.BACKUP_DIR, readdirSync(env.BACKUP_DIR)[0]);

  const server = await startServer(t, env);
  const admin = client(server.url);
  await login(admin, 'admin');
  await admin.post('/api/admin/courses', {
    title: '快照之后的课程', summary: '恢复后应当消失', instructor: '测试', level: 'beginner', videoFile: 'python-basics.mp4',
  });
  const refused = await runNode('scripts/restore.js', env, projectRoot, [snapshot]);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /学堂仍在运行/);
  server.child.kill('SIGINT');
  assert.equal(await server.exited, 0);

  const junk = join(env.BACKUP_DIR, 'not-a-database.sqlite');
  writeFileSync(junk, 'hello');
  const bad = await runNode('scripts/restore.js', env, projectRoot, [junk]);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /恢复失败/);
  assert.ok(courseTitles(dbFile).includes('快照之后的课程'), '无效快照不改动当前数据库');

  assert.match((await runNode('scripts/restore.js', env)).stderr, /请指定要恢复的备份文件/);

  const restored = await runNode('scripts/restore.js', env, projectRoot, [snapshot]);
  assert.equal(restored.code, 0, restored.stderr);
  assert.match(restored.stdout, /快照之后产生的数据不在恢复后的数据库中/);
  assert.ok(!courseTitles(dbFile).includes('快照之后的课程'));
  const saved = readdirSync(env.BACKUP_DIR).find((name) => name.startsWith('before-restore-'));
  assert.ok(saved);
  assert.ok(courseTitles(join(env.BACKUP_DIR, saved)).includes('快照之后的课程'));

  const after = await startServer(t, env);
  const response = await fetch(`${after.url}/api/courses`);
  assert.equal((await response.json()).courses.length, 3);
});

test('新增迁移后：启动被拒绝，备份并迁移后保留原数据启动', async (t) => {
  const root = projectCopy(t);
  const env = environment(t);
  const first = await startServer(t, env, root);
  first.child.kill('SIGINT');
  await first.exited;

  // 编号从 900 起，不与课上新增的迁移冲突。
  writeFileSync(join(root, 'migrations/900-course-tags.sql'), [
    '-- SPDX-License-Identifier: Apache-2.0',
    'ALTER TABLE courses ADD COLUMN tags TEXT NOT NULL DEFAULT \'\';',
    '',
  ].join('\n'));

  const blocked = spawn(process.execPath, [...NODE_ARGS, join(root, 'src/main.js')], { cwd: root, env });
  let blockedOutput = '';
  blocked.stdout.on('data', (chunk) => { blockedOutput += chunk; });
  blocked.stderr.on('data', (chunk) => { blockedOutput += chunk; });
  const [blockedCode] = await once(blocked, 'exit');
  assert.equal(blockedCode, 1);
  assert.match(blockedOutput, /1 个待执行的迁移/);
  assert.match(blockedOutput, /900-course-tags\.sql/);
  assert.match(blockedOutput, /npm run backup/);
  assert.match(blockedOutput, /npm run migrate/);
  assert.equal(existsSync(join(env.DATA_DIR, 'run.json')), false);

  const backup = await runNode('scripts/backup.js', env, root);
  assert.equal(backup.code, 0, backup.stderr);

  const migrated = await runNode('scripts/migrate.js', env, root);
  assert.equal(migrated.code, 0, migrated.stderr);
  assert.match(migrated.stdout, /已执行 1 个迁移/);
  assert.match(migrated.stdout, /900-course-tags\.sql/);
  const nothing = await runNode('scripts/migrate.js', env, root);
  assert.match(nothing.stdout, /没有待执行的迁移/);

  const server = await startServer(t, env, root);
  const health = await (await fetch(`${server.url}/api/health`)).json();
  const baseline = readMigrationFiles(defaultMigrationsDir).map((m) => m.filename);
  assert.deepEqual(health.migrations, { applied: [...baseline, '900-course-tags.sql'], pending: [] });
  assert.equal((await (await fetch(`${server.url}/api/courses`)).json()).courses.length, 3);
  const student = client(server.url);
  await login(student);
  await student.post('/api/courses/1/enrollment');
  assert.equal((await student.post('/api/courses/1/play')).status, 200);

  const whileRunning = await runNode('scripts/migrate.js', env, root);
  assert.equal(whileRunning.code, 1);
  assert.match(whileRunning.stderr, /学堂仍在运行/);
  server.child.kill('SIGINT');
  await server.exited;

  appendFileSync(join(root, 'migrations/001-init.sql'), '-- 改动已执行的迁移\n');
  const changed = await runNode('scripts/migrate.js', env, root);
  assert.equal(changed.code, 1);
  assert.match(changed.stderr, /被修改过：001-init\.sql/);
});

test('同一数据目录不能启动第二个服务', async (t) => {
  const env = environment(t);
  await startServer(t, env);
  const second = await runNode('src/main.js', env);
  assert.equal(second.code, 1);
  assert.match(second.stderr, /已有学堂在运行/);
});


const enroll = (c, id) => c.post(`/api/courses/${id}/enrollment`);
const cancel = (c, id) => c.request(`/api/courses/${id}/enrollment`, { method: 'DELETE', json: {} });
async function enrollmentIds(c) {
  const response = await c.get('/api/enrollments');
  assert.equal(response.status, 200);
  return (await response.json()).enrollments.map((item) => item.courseId);
}

// 只在临时数据库内安装故障夹具；不输出凭据或数据库内容。
function withDatabase(env, action) {
  const db = openDatabase(join(env.DATA_DIR, 'academy.sqlite'));
  try { return action(db); } finally { db.close(); }
}

test('报名升级演练保留旧库全部业务字段、修改后的凭据与自建课程', async (t) => {
  const root = projectCopy(t);
  const env = environment(t);
  const migrationDir = join(root, 'migrations');
  for (const migration of readMigrationFiles(migrationDir)) {
    if (migration.filename !== '001-init.sql') unlinkSync(join(migrationDir, migration.filename));
  }
  const before = withDatabase(env, (db) => {
    applyMigrations(db, migrationDir);
    seedIfNeeded(db);
    const { hash, salt } = hashPassword('演练专用密码');
    db.prepare("UPDATE users SET username = 'legacy-student', display_name = '原有学员', password_hash = ?, password_salt = ?, created_at = 123 WHERE username = 'student'").run(hash, salt);
    db.exec("UPDATE courses SET title = '原有课程', summary = '保留摘要', description = '保留正文', instructor = '原讲师', level = 'advanced', duration_seconds = 18, video_file = 'python-basics.mp4', published = 0, created_at = 123, updated_at = 456 WHERE id = 1");
    db.exec("INSERT INTO courses SELECT 80, '自建课程', summary, description, instructor, level, duration_seconds, video_file, 1, 321, 654 FROM courses WHERE id = 2");
    return { users: db.prepare('SELECT * FROM users ORDER BY id').all(), courses: db.prepare('SELECT * FROM courses ORDER BY id').all() };
  });
  cpSync(defaultMigrationsDir, migrationDir, { recursive: true });
  const blocked = await runNode('src/main.js', env, root);
  assert.equal(blocked.code, 1);
  assert.match(blocked.stderr, /002-enrollments.sql/);
  const backup = await runNode('scripts/backup.js', env, root);
  assert.equal(backup.code, 0, backup.stderr);
  const snapshot = join(env.BACKUP_DIR, readdirSync(env.BACKUP_DIR)[0]);
  const migrated = await runNode('scripts/migrate.js', env, root);
  assert.equal(migrated.code, 0, migrated.stderr);
  assert.match(migrated.stdout, /002-enrollments.sql/);
  const again = await runNode('scripts/migrate.js', env, root);
  assert.equal(again.code, 0, again.stderr);
  assert.match(again.stdout, /没有待执行的迁移/);
  withDatabase(env, (db) => {
    assert.deepEqual(db.prepare('SELECT * FROM users ORDER BY id').all(), before.users);
    assert.deepEqual(db.prepare('SELECT * FROM courses ORDER BY id').all(), before.courses);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM enrollments').get().n, 0);
  });
  const server = await startServer(t, env, root);
  const c = client(server.url);
  await login(c, 'legacy-student', '演练专用密码');
  assert.deepEqual(await enrollmentIds(c), []);
  assert.equal((await c.post('/api/courses/80/play')).status, 403);
  server.child.kill('SIGINT');
  assert.equal(await server.exited, 0);
  // 恢复升级前的快照，仍必须先迁移，不能把旧库误认作最新结构。
  const restored = await runNode('scripts/restore.js', env, root, [snapshot]);
  assert.equal(restored.code, 0, restored.stderr);
  assert.equal((await runNode('src/main.js', env, root)).code, 1);
  assert.equal((await runNode('scripts/migrate.js', env, root)).code, 0);
  const restarted = await startServer(t, env, root);
  await login(client(restarted.url), 'legacy-student', '演练专用密码');
});

test('报名与取消经退出重登、账号切换和进程重启保持归属，失败写入整体回滚', async (t) => {
  const env = environment(t);
  const first = await startServer(t, env);
  const c = client(first.url);
  await login(c);
  assert.equal((await enroll(c, 1)).status, 200);
  assert.equal((await enroll(c, 2)).status, 200);
  assert.equal((await cancel(c, 2)).status, 200);
  assert.equal((await c.post('/api/logout')).status, 200);
  await login(c, 'student2');
  assert.deepEqual(await enrollmentIds(c), []);
  assert.equal((await enroll(c, 3)).status, 200);
  assert.equal((await enroll(c, 2)).status, 200);
  assert.equal((await cancel(c, 2)).status, 200);
  await c.post('/api/logout');
  await login(c);
  assert.deepEqual(await enrollmentIds(c), [1]);
  first.child.kill('SIGINT');
  assert.equal(await first.exited, 0);
  const server = await startServer(t, env);
  for (const [name, ids, allowed] of [['student', [1], 1], ['student2', [3], 3]]) {
    const user = client(server.url);
    await login(user, name);
    assert.deepEqual(await enrollmentIds(user), ids);
    assert.equal((await user.post(`/api/courses/${allowed}/play`)).status, 200);
    assert.equal((await user.post('/api/courses/2/play')).status, 403);
  }
  const user = client(server.url);
  await login(user);
  withDatabase(env, (db) => db.exec("CREATE TRIGGER fail_enrollment AFTER INSERT ON enrollments BEGIN UPDATE courses SET title = '不应保留' WHERE id = 1; SELECT RAISE(ABORT, '演练写入失败'); END"));
  const title = withDatabase(env, (db) => db.prepare('SELECT title FROM courses WHERE id = 1').get().title);
  const failure = await enroll(user, 2);
  assert.equal(failure.status, 500);
  assert.deepEqual(await failure.json(), { error: '服务暂时不可用，请稍后重试' });
  assert.deepEqual(await enrollmentIds(user), [1]);
  withDatabase(env, (db) => {
    assert.equal(db.prepare('SELECT title FROM courses WHERE id = 1').get().title, title);
    db.exec('DROP TRIGGER fail_enrollment');
    db.exec("CREATE TRIGGER fail_cancel AFTER DELETE ON enrollments BEGIN DELETE FROM enrollments; SELECT RAISE(ABORT, '演练取消失败'); END");
  });
  assert.equal((await cancel(user, 1)).status, 500);
  assert.deepEqual(await enrollmentIds(user), [1]);
  withDatabase(env, (db) => {
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM enrollments').get().n, 2);
    db.exec('DROP TRIGGER fail_cancel');
  });
  assert.equal((await enroll(user, 2)).status, 200);
});

test('报名快照恢复有效与已取消状态，后续变化仅存在于恢复前副本', async (t) => {
  const env = environment(t);
  const first = await startServer(t, env);
  const a = client(first.url), b = client(first.url);
  await login(a); await login(b, 'student2');
  assert.equal((await enroll(a, 1)).status, 200);
  assert.equal((await enroll(b, 2)).status, 200);
  assert.equal((await cancel(b, 2)).status, 200);
  const backup = await runNode('scripts/backup.js', env);
  assert.equal(backup.code, 0, backup.stderr);
  assert.equal(await first.exited, 0);
  const snapshot = join(env.BACKUP_DIR, readdirSync(env.BACKUP_DIR)[0]);
  const second = await startServer(t, env);
  const laterA = client(second.url), laterB = client(second.url);
  await login(laterA); await login(laterB, 'student2');
  assert.equal((await cancel(laterA, 1)).status, 200);
  assert.equal((await enroll(laterB, 2)).status, 200);
  assert.equal((await enroll(laterA, 3)).status, 200);
  second.child.kill('SIGINT');
  assert.equal(await second.exited, 0);
  const restored = await runNode('scripts/restore.js', env, projectRoot, [snapshot]);
  assert.equal(restored.code, 0, restored.stderr);
  const saved = readdirSync(env.BACKUP_DIR).find((name) => name.startsWith('before-restore-'));
  assert.ok(saved);
  const db = new DatabaseSync(join(env.BACKUP_DIR, saved), { readOnly: true });
  try {
    assert.deepEqual(db.prepare('SELECT user_id, course_id FROM enrollments ORDER BY user_id, course_id').all().map((r) => [r.user_id, r.course_id]), [[2, 3], [3, 2]]);
  } finally { db.close(); }
  const after = await startServer(t, env);
  const restoredA = client(after.url), restoredB = client(after.url);
  await login(restoredA); await login(restoredB, 'student2');
  assert.deepEqual(await enrollmentIds(restoredA), [1]);
  assert.deepEqual(await enrollmentIds(restoredB), []);
  assert.equal((await restoredA.post('/api/courses/1/play')).status, 200);
  assert.equal((await restoredA.post('/api/courses/3/play')).status, 403);
  assert.equal((await restoredB.post('/api/courses/2/play')).status, 403);
});
