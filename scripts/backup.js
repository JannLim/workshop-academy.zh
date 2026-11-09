// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

// npm run backup：先请运行中的服务正常停止（关闭数据库），再复制数据库文件。

import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { readRunInfo } from '../src/app.js';
import {
  claimForTask, command, copyToBackups, dataDir, dbFile, displayDir, displayPath, inspectDatabase, runScript,
} from './lib.js';

/** 服务在运行时请它停止，返回它原来的地址；没有运行时返回 null。 */
async function stopRunningServer() {
  const info = readRunInfo(dataDir);
  if (!info?.alive) return null;
  if (info.task) throw new Error(`这个数据目录正在${info.task}（进程 ${info.pid}），请等它完成后再备份。`);
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(info.url || '') || !/^[0-9a-f]{64}$/.test(info.token || '')) {
    throw new Error('学堂正在启动或运行记录无法识别。请在服务终端按 Ctrl+C 停止后再备份。');
  }
  console.log(`学堂正在运行（${info.url}），正在请求它正常停止…`);
  let response;
  try {
    response = await fetch(`${info.url}/internal/stop`, {
      method: 'POST',
      headers: { 'x-maintenance-token': info.token },
      signal: AbortSignal.timeout(5000),
    });
    await response.arrayBuffer();
  } catch (error) {
    throw new Error(`无法联系运行中的服务（${error.message}）。请在服务终端按 Ctrl+C 停止后再备份。`);
  }
  if (response.status !== 202) throw new Error(`服务拒绝了停止请求（HTTP ${response.status}），未做备份。`);
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const current = readRunInfo(dataDir);
    if (!current || !current.alive || current.pid !== info.pid) return info.url;
    await sleep(50);
  }
  throw new Error('服务没有在 15 秒内停止，未做备份。请检查服务终端。');
}

await runScript('备份', async () => {
  const stoppedUrl = await stopRunningServer();
  const stopped = Boolean(stoppedUrl);
  if (stopped) console.log('学堂已正常停止，数据库已关闭。');
  // 重启提示沿用原来的端口；默认端口 3000 不必写出。
  const port = stopped ? new URL(stoppedUrl).port : process.env.PORT;
  const startCommand = command('npm start', { port: port && port !== '3000' && port !== '0' ? port : undefined });
  if (!existsSync(dbFile)) throw new Error(`${displayPath(dbFile)} 不存在，这个数据目录还没有数据库。请先运行一次 ${command('npm start')}。`);
  const claim = claimForTask('备份');
  try {
    // 以读写方式打开一次：若上次异常退出留下日志文件，SQLite 会先回滚到一致状态。
    inspectDatabase(dbFile, { readOnly: false });
    const target = copyToBackups(dbFile, 'academy');
    const summary = inspectDatabase(target);
    console.log(`已备份：${displayDir(dataDir)} → ${displayPath(target)}`);
    console.log(`  账号 ${summary.users} 个，课程 ${summary.courses} 门，已执行迁移 ${summary.migrations} 个`);
    console.log(`服务${stopped ? '已停止' : '未在运行'}，需要时用 ${startCommand} 启动。`);
  } finally {
    claim.release();
  }
});
