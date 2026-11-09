// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

// npm run migrate：在服务停止时执行 migrations/ 中待执行的迁移。

import { existsSync } from 'node:fs';
import { applyMigrations, migrationStatus, openDatabase, MigrationError } from '../src/db.js';
import { claimForTask, command, dbFile, displayPath, ensureStopped, runScript } from './lib.js';

await runScript('迁移', async () => {
  ensureStopped('执行迁移');
  const fresh = !existsSync(dbFile);
  const claim = claimForTask('执行迁移');
  try {
    const db = openDatabase(dbFile);
    try {
      const before = migrationStatus(db);
      if (!before.problems.length && !before.pending.length) {
        console.log(`没有待执行的迁移，数据库已是最新（已执行 ${before.applied.length} 个）。`);
        console.log(`数据库：${displayPath(dbFile)}`);
        return;
      }
      let applied;
      try {
        applied = applyMigrations(db);
      } catch (error) {
        if (error instanceof MigrationError && error.applied.length) {
          console.error(`本次已成功执行：${error.applied.join('、')}`);
        }
        if (error instanceof MigrationError && error.cause) {
          throw new Error(`${error.message}\n修正该迁移文件后重新运行 ${command('npm run migrate')}；如需回到迁移前的数据，可用 ${command('npm run restore -- <备份文件>')} 恢复。`);
        }
        throw error;
      }
      if (fresh) console.log('尚无数据库，已新建并执行全部迁移；首次启动时会写入示例数据。');
      console.log(`已执行 ${applied.length} 个迁移：`);
      for (const name of applied) console.log(`  - ${name}`);
      console.log(`数据库：${displayPath(dbFile)}`);
      console.log(`现在可以启动：${command('npm start')}`);
    } finally {
      db.close();
    }
  } finally {
    claim.release();
  }
});
