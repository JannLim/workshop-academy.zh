// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

// npm run restore -- <备份文件>：服务停止时，用快照替换当前数据库。
// 当前数据库会先另存到 backups/before-restore[-<数据目录>]-<时间>.sqlite。

import { copyFileSync, existsSync, renameSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrationStatus, openDatabase } from '../src/db.js';
import {
  claimForTask, command, copyToBackups, dbFile, displayPath, ensureStopped, inspectDatabase, runScript,
} from './lib.js';

await runScript('恢复', async () => {
  const arg = process.argv[2];
  if (!arg) throw new Error(`请指定要恢复的备份文件，例如：${command('npm run restore -- backups/academy-20261108-153000.sqlite')}`);
  // npm 会把当前目录切到项目根目录；相对路径按执行命令时所在的目录解析。
  const source = resolve(process.env.INIT_CWD || process.cwd(), arg);
  if (!existsSync(source) || !statSync(source).isFile()) throw new Error(`找不到备份文件：${arg}`);
  if (source === dbFile) throw new Error('备份文件就是当前数据库，无需恢复。');
  ensureStopped('恢复');
  const summary = inspectDatabase(source);

  const claim = claimForTask('恢复');
  let saved = null;
  try {
    if (existsSync(dbFile)) saved = copyToBackups(dbFile, 'before-restore');
    const temp = `${dbFile}.restore-${process.pid}.tmp`;
    copyFileSync(source, temp);
    for (const suffix of ['-journal', '-wal', '-shm']) rmSync(`${dbFile}${suffix}`, { force: true });
    renameSync(temp, dbFile);
  } finally {
    claim.release();
  }

  const db = openDatabase(dbFile, { readOnly: true });
  let pending;
  try {
    pending = migrationStatus(db).pending.map((m) => m.filename);
  } finally {
    db.close();
  }
  console.log(`已恢复：${displayPath(source)} → ${displayPath(dbFile)}`);
  console.log(`  账号 ${summary.users} 个，课程 ${summary.courses} 门，已执行迁移 ${summary.migrations} 个`);
  if (saved) console.log(`恢复前的数据库已另存为：${displayPath(saved)}`);
  console.log('注意：快照之后产生的数据不在恢复后的数据库中。');
  if (pending.length) {
    console.log(`这份快照还有 ${pending.length} 个待执行的迁移（${pending.join('、')}），请先运行：${command('npm run migrate')}`);
  }
  console.log(`然后启动：${command('npm start')}`);
});
