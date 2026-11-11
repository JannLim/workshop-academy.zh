// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyMigrations, databaseFile, defaultMigrationsDir, migrationStatus, openDatabase, readMigrationFiles, MigrationError,
} from '../src/db.js';
import { seedIfNeeded, DEMO_PASSWORD } from '../src/seed.js';
import { verifyPassword } from '../src/auth.js';

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'academy-db-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// 项目自带的迁移；课上新增迁移后测试照样成立。测试用的迁移编号从 900 起，不与项目文件冲突。
const baseline = readMigrationFiles(defaultMigrationsDir).map((m) => m.filename);

function copyMigrations(t) {
  const dir = join(tempDir(t), 'migrations');
  cpSync(defaultMigrationsDir, dir, { recursive: true });
  return dir;
}

test('新数据库执行全部迁移并写入示例数据，重复执行不改变数据', (t) => {
  const file = databaseFile(tempDir(t));
  const db = openDatabase(file);
  t.after(() => db.close());
  assert.deepEqual(applyMigrations(db), baseline);
  assert.equal(seedIfNeeded(db), true);

  const users = db.prepare('SELECT username, display_name, role FROM users ORDER BY id').all();
  assert.deepEqual(users.map((u) => [u.username, u.role]), [['admin', 'admin'], ['student', 'student'], ['student2', 'student']]);
  assert.ok(users.every((u) => /\p{Script=Han}/u.test(u.display_name)));
  const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
  assert.equal(verifyPassword(admin, DEMO_PASSWORD), true);
  assert.equal(verifyPassword(admin, 'wrong'), false);
  assert.notEqual(admin.password_hash, DEMO_PASSWORD);

  const courses = db.prepare('SELECT published, video_file FROM courses ORDER BY id').all();
  assert.equal(courses.length, 4);
  assert.equal(courses.filter((c) => c.published === 1).length, 3);
  assert.equal(new Set(courses.map((c) => c.video_file)).size, 4);
  assert.match(db.prepare("SELECT value FROM settings WHERE key = 'playback_secret'").get().value, /^[0-9a-f]{64}$/);

  assert.deepEqual(applyMigrations(db), []);
  assert.equal(seedIfNeeded(db), false);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 3);
});

test('迁移状态列出待执行文件，执行失败的文件整体回滚', (t) => {
  const migrations = copyMigrations(t);
  const db = openDatabase(databaseFile(tempDir(t)));
  t.after(() => db.close());
  applyMigrations(db, migrations);

  writeFileSync(join(migrations, '900-add-tags.sql'), 'CREATE TABLE tags (id INTEGER PRIMARY KEY);\n');
  writeFileSync(join(migrations, '901-broken.sql'), 'CREATE TABLE broken (id INTEGER);\nINSERT INTO missing_table VALUES (1);\n');
  const status = migrationStatus(db, migrations);
  assert.deepEqual(status.applied, baseline);
  assert.deepEqual(status.pending.map((m) => m.filename), ['900-add-tags.sql', '901-broken.sql']);
  assert.deepEqual(status.problems, []);

  assert.throws(() => applyMigrations(db, migrations), (error) => {
    assert.ok(error instanceof MigrationError);
    assert.match(error.message, /901-broken\.sql/);
    assert.deepEqual(error.applied, ['900-add-tags.sql']);
    return true;
  });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
  assert.ok(tables.includes('tags'));
  assert.ok(!tables.includes('broken'));
  assert.deepEqual(migrationStatus(db, migrations).pending.map((m) => m.filename), ['901-broken.sql']);
});

test('已执行的迁移被修改、删除或新文件排在前面时拒绝迁移', (t) => {
  const migrations = copyMigrations(t);
  const db = openDatabase(databaseFile(tempDir(t)));
  t.after(() => db.close());
  writeFileSync(join(migrations, '905-later.sql'), 'CREATE TABLE later (id INTEGER);\n');
  applyMigrations(db, migrations);

  writeFileSync(join(migrations, '903-earlier.sql'), 'CREATE TABLE earlier (id INTEGER);\n');
  assert.throws(() => applyMigrations(db, migrations), /903-earlier\.sql 排在已执行的 905-later\.sql 之前/);
  unlinkSync(join(migrations, '903-earlier.sql'));

  appendFileSync(join(migrations, '905-later.sql'), '-- 改动\n');
  assert.throws(() => applyMigrations(db, migrations), /被修改过：905-later\.sql/);

  unlinkSync(join(migrations, '905-later.sql'));
  assert.throws(() => applyMigrations(db, migrations), /不见了：905-later\.sql/);

  writeFileSync(join(migrations, '906-坏名字.sql'), 'SELECT 1;\n');
  assert.throws(() => applyMigrations(db, migrations), /文件名不符合/);
});

test('报名迁移保留旧账号课程且不自动报名', (t) => {
  const db = openDatabase(databaseFile(tempDir(t)));
  t.after(() => db.close());
  const old = join(tempDir(t), 'migrations');
  cpSync(defaultMigrationsDir, old, { recursive: true });
  for (const file of readMigrationFiles(old)) if (file.filename !== '001-init.sql') unlinkSync(join(old, file.filename));
  applyMigrations(db, old);
  seedIfNeeded(db);
  db.prepare("UPDATE courses SET title = '保留的课程' WHERE id = 1").run();
  const users = db.prepare('SELECT * FROM users').all();
  const courses = db.prepare('SELECT * FROM courses').all();
  applyMigrations(db);
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'enrollments'").get(), '存在报名表');
  assert.deepEqual(db.prepare('SELECT * FROM users').all(), users);
  assert.deepEqual(db.prepare('SELECT * FROM courses').all(), courses);
  assert.equal(db.prepare('SELECT count(*) AS n FROM enrollments').get().n, 0);
  db.prepare('INSERT INTO enrollments (user_id, course_id, created_at) VALUES (2, 1, 1)').run();
  assert.throws(() => db.prepare('INSERT INTO enrollments (user_id, course_id, created_at) VALUES (2, 1, 2)').run(), /UNIQUE/);
  assert.throws(() => db.prepare('INSERT INTO enrollments (user_id, course_id, created_at) VALUES (999, 1, 2)').run(), /FOREIGN KEY/);
  assert.deepEqual(applyMigrations(db), []);
});
