// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

// 维护脚本共用：数据目录、备份目录、运行状态检查与输出格式。

import { constants, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, relative, resolve, sep } from 'node:path';
import { databaseFile, hasTable, openDatabase, projectRoot, resolveDataDir } from '../src/db.js';
import { claimRunFile, readRunInfo } from '../src/app.js';

export const dataDir = resolveDataDir();
export const dbFile = databaseFile(dataDir);
export const backupDir = process.env.BACKUP_DIR ? resolve(process.env.BACKUP_DIR) : resolve(projectRoot, 'backups');
export const REQUIRED_TABLES = ['schema_migrations', 'settings', 'users', 'courses'];

/** 用户看到的命令带上当前的 DATA_DIR（以及需要时的 PORT），照抄即可作用于同一份数据。 */
export function command(script, { port } = {}) {
  const env = [];
  if (process.env.DATA_DIR) env.push(`DATA_DIR=${process.env.DATA_DIR}`);
  if (port) env.push(`PORT=${port}`);
  return [...env, script].join(' ');
}

/**
 * 备份文件名里的数据目录标签：默认的 data/ 不加标签，
 * 其他目录用目录名（例如 academy-data-acceptance-<时间>.sqlite），几份数据的备份放在一起也分得清。
 */
export function dataLabel(dir = dataDir) {
  if (dir === resolveDataDir('')) return '';
  return basename(dir).replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '');
}

/** 项目内的路径显示为相对路径，其他显示为绝对路径。 */
export function displayPath(file) {
  const rel = relative(process.cwd(), file);
  return rel && !rel.startsWith('..') && !rel.startsWith(sep) ? rel : file;
}

/** 数据目录显示为“data/”这样的形式。 */
export function displayDir(dir) {
  return `${displayPath(dir)}/`;
}

export function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** 复制到 backups/<prefix>[-<数据目录>]-<时间>.sqlite，不覆盖已有文件。 */
export function copyToBackups(source, prefix) {
  mkdirSync(backupDir, { recursive: true });
  const label = dataLabel();
  const stamp = label ? `${label}-${timestamp()}` : timestamp();
  for (let n = 1; n < 100; n += 1) {
    const target = resolve(backupDir, `${prefix}-${stamp}${n > 1 ? `-${n}` : ''}.sqlite`);
    if (existsSync(target)) continue;
    copyFileSync(source, target, constants.COPYFILE_EXCL);
    return target;
  }
  throw new Error('备份目录中同名文件过多，请稍后重试');
}

/** 服务仍在运行（或另一个维护任务正在进行）时拒绝继续。 */
export function ensureStopped(action) {
  const info = readRunInfo(dataDir);
  if (!info?.alive) return;
  if (info.task) throw new Error(`这个数据目录正在${info.task}（进程 ${info.pid}），请等它完成后再${action}。`);
  throw new Error(`学堂仍在运行（进程 ${info.pid}${info.url ? `，${info.url}` : ''}）。请先在服务终端按 Ctrl+C 停止，再${action}。`);
}

/** 维护期间占用运行记录，防止同时启动服务。 */
export function claimForTask(task) {
  mkdirSync(dataDir, { recursive: true });
  return claimRunFile(dataDir, { pid: process.pid, url: null, token: null, task, startedAt: Date.now() });
}

/** 检查数据库文件完整且是学堂的数据库，返回概况。 */
export function inspectDatabase(file, { readOnly = true } = {}) {
  let db;
  try {
    db = openDatabase(file, { readOnly });
  } catch (error) {
    throw new Error(`无法打开数据库 ${displayPath(file)}：${error.message}`);
  }
  try {
    let check;
    try {
      check = db.prepare('PRAGMA quick_check').all().map((row) => Object.values(row)[0]);
    } catch (error) {
      throw new Error(`${displayPath(file)} 不是有效的 SQLite 数据库：${error.message}`);
    }
    if (check.length !== 1 || check[0] !== 'ok') {
      throw new Error(`${displayPath(file)} 未通过 SQLite 完整性检查：${check.slice(0, 3).join('；')}`);
    }
    const missing = REQUIRED_TABLES.filter((name) => !hasTable(db, name));
    if (missing.length) throw new Error(`${displayPath(file)} 不是学堂的数据库（缺少表：${missing.join('、')}）`);
    return {
      users: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
      courses: db.prepare('SELECT COUNT(*) AS n FROM courses').get().n,
      migrations: db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n,
    };
  } finally {
    db.close();
  }
}

/** 运行脚本主体，失败时打印中文原因并以 1 退出。 */
export async function runScript(label, main) {
  try {
    await main();
  } catch (error) {
    console.error(`${label}失败：${error.message}`);
    process.exitCode = 1;
  }
}
