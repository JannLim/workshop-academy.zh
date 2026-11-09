// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const defaultMigrationsDir = resolve(projectRoot, 'migrations');
export const DATABASE_FILENAME = 'academy.sqlite';

const MIGRATION_FILENAME = /^(\d{3,})-[a-z0-9][a-z0-9-]*\.sql$/;

export class MigrationError extends Error {
  constructor(message, { problems = [], applied = [], cause } = {}) {
    super(message, { cause });
    this.name = 'MigrationError';
    this.problems = problems;
    this.applied = applied;
  }
}

/** 数据目录：DATA_DIR 相对当前目录解析，默认为项目下的 data/。 */
export function resolveDataDir(value = process.env.DATA_DIR) {
  return value ? resolve(value) : resolve(projectRoot, 'data');
}

export function databaseFile(dataDir) {
  return resolve(dataDir, DATABASE_FILENAME);
}

export function openDatabase(file, { readOnly = false } = {}) {
  return new DatabaseSync(file, { readOnly, timeout: 5000, enableForeignKeyConstraints: true });
}

export function hasTable(db, name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

export function getSetting(db, key) {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null;
}

export function setSetting(db, key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

/** 读取迁移目录，按文件名排序；文件名必须是“编号-英文短名.sql”。 */
export function readMigrationFiles(dir = defaultMigrationsDir) {
  const files = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort();
  const numbers = new Map();
  return files.map((filename) => {
    const match = MIGRATION_FILENAME.exec(filename);
    if (!match) {
      throw new MigrationError(`迁移文件名不符合“编号-英文短名.sql”格式：${filename}`);
    }
    const number = Number(match[1]);
    if (numbers.has(number)) {
      throw new MigrationError(`迁移编号重复：${numbers.get(number)} 与 ${filename}`);
    }
    numbers.set(number, filename);
    const sql = readFileSync(resolve(dir, filename), 'utf8');
    return { filename, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  });
}

/**
 * 对比迁移目录与数据库中的执行记录。
 * problems 非空表示已执行记录与文件不一致，必须人工处理，不能继续迁移。
 */
export function migrationStatus(db, dir = defaultMigrationsDir) {
  const files = readMigrationFiles(dir);
  const applied = hasTable(db, 'schema_migrations')
    ? db.prepare('SELECT filename, checksum FROM schema_migrations ORDER BY filename').all()
    : [];
  const byName = new Map(files.map((file) => [file.filename, file]));
  const appliedNames = new Set(applied.map((row) => row.filename));
  const problems = [];
  for (const row of applied) {
    const file = byName.get(row.filename);
    if (!file) problems.push(`已执行的迁移文件不见了：${row.filename}`);
    else if (file.checksum !== row.checksum) problems.push(`已执行的迁移文件被修改过：${row.filename}`);
  }
  const pending = files.filter((file) => !appliedNames.has(file.filename));
  const lastApplied = applied.at(-1)?.filename;
  for (const file of pending) {
    if (lastApplied && file.filename < lastApplied) {
      problems.push(`新迁移 ${file.filename} 排在已执行的 ${lastApplied} 之前，请改用更大的编号`);
    }
  }
  return { applied: applied.map((row) => row.filename), pending, problems };
}

/** 依次执行待执行的迁移，每个文件一个事务；返回本次执行的文件名。 */
export function applyMigrations(db, dir = defaultMigrationsDir) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at INTEGER NOT NULL
  )`);
  const status = migrationStatus(db, dir);
  if (status.problems.length) {
    throw new MigrationError(`迁移记录与迁移文件不一致：\n${status.problems.map((p) => `  - ${p}`).join('\n')}`, { problems: status.problems });
  }
  const record = db.prepare('INSERT INTO schema_migrations (filename, checksum, applied_at) VALUES (?, ?, ?)');
  const done = [];
  for (const migration of status.pending) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migration.sql);
      record.run(migration.filename, migration.checksum, Date.now());
      db.exec('COMMIT');
      done.push(migration.filename);
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch { /* 事务可能已被 SQL 自身结束 */ }
      throw new MigrationError(`迁移 ${migration.filename} 执行失败，该文件已整体回滚：${error.message}`, { applied: done, cause: error });
    }
  }
  return done;
}

/** 在一个事务中执行 fn；出错时回滚并抛出原错误。 */
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* 已回滚 */ }
    throw error;
  }
}
