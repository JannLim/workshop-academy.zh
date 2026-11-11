// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';

/**
 * 删除测试临时目录。Windows 上 SQLite 或子进程可能仍占用文件，
 * 这时重试几次；仍失败就留给系统清理，避免把清理失败误报成测试失败。
 */
export function removeTempDir(dir) {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    if (!['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)) throw error;
  }
}

export function tempDir(t, prefix = 'academy-test-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => removeTempDir(dir));
  return dir;
}

/** 逐文件复制目录；避开部分 Node 版本在 Windows 上递归 cpSync 的原生崩溃。 */
export function copyDirectory(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else if (entry.isFile()) copyFileSync(from, to);
  }
}

/** 在临时数据目录、随机端口上启动真实服务，测试结束后停止。 */
export async function startApp(t, options = {}) {
  const ownsDir = options.dataDir === undefined;
  const dataDir = options.dataDir ?? mkdtempSync(join(tmpdir(), 'academy-test-'));
  const app = createApp({ dataDir, port: 0, ...options });
  t.after(() => app.stop());
  if (ownsDir) t.after(() => removeTempDir(dataDir));
  await app.start();
  return app;
}

/** 带 cookie 的 HTTP 客户端，像浏览器一样保存会话。 */
export function client(baseUrl) {
  const jar = new Map();
  async function request(path, { method = 'GET', json, headers = {}, body, ...rest } = {}) {
    const finalHeaders = { ...headers };
    if (jar.size) finalHeaders.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    let finalBody = body;
    if (json !== undefined) {
      finalHeaders['content-type'] ??= 'application/json';
      finalBody = JSON.stringify(json);
    }
    const response = await fetch(new URL(path, baseUrl), { method, headers: finalHeaders, body: finalBody, redirect: 'manual', ...rest });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair, ...attrs] = cookie.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (!value || attrs.some((a) => /max-age=0/i.test(a.trim()))) jar.delete(name);
      else jar.set(name, value);
    }
    return response;
  }
  return {
    jar,
    request,
    get: (path, options) => request(path, options),
    post: (path, json = {}, options = {}) => request(path, { method: 'POST', json, ...options }),
    patch: (path, json = {}, options = {}) => request(path, { method: 'PATCH', json, ...options }),
    del: (path, json = {}, options = {}) => request(path, { method: 'DELETE', json, ...options }),
  };
}

export async function login(c, username = 'student', password = '123456') {
  const response = await c.post('/api/login', { username, password });
  if (response.status !== 200) throw new Error(`登录失败：${response.status} ${await response.text()}`);
  return (await response.json()).user;
}
