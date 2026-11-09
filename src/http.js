// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

export const MAX_BODY_BYTES = 64 * 1024;

/** 带 HTTP 状态码的错误；message 是给用户看的中文消息。 */
export class HttpError extends Error {
  constructor(status, message, { fields, headers } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.fields = fields;
    this.headers = headers;
  }
}

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('Cache-Control', 'no-store');
}

export function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

export function sendHtml(res, status, html, headers = {}) {
  const payload = String(html);
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

export function redirect(res, location, status = 302) {
  res.writeHead(status, { Location: location, 'Content-Length': 0 });
  res.end();
}

export function isJsonRequest(req) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  return type === 'application/json';
}

/** 读取 JSON 对象请求体；空请求体视为 {}。 */
export async function readJson(req, limit = MAX_BODY_BYTES) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > limit) {
    throw new HttpError(413, '提交的内容过大', { headers: { Connection: 'close' } });
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, '提交的内容过大', { headers: { Connection: 'close' } });
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new HttpError(400, '请求体不是有效的 JSON');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, '请求体应为 JSON 对象');
  }
  return value;
}

export function parseCookies(header = '') {
  const cookies = new Map();
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    if (!cookies.has(name)) cookies.set(name, part.slice(index + 1).trim());
  }
  return cookies;
}

export function serializeCookie(name, value, { maxAge, path = '/', httpOnly = true, sameSite = 'Lax' } = {}) {
  const parts = [`${name}=${value}`, `Path=${path}`];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (httpOnly) parts.push('HttpOnly');
  if (sameSite) parts.push(`SameSite=${sameSite}`);
  return parts.join('; ');
}

/** 常数时间比较两个字符串（先取摘要，长度不同也不提前返回）。 */
export function constantTimeEqual(a, b) {
  const left = createHash('sha256').update(String(a)).digest();
  const right = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(left, right) && String(a).length === String(b).length;
}

/** 把路径参数转成正整数编号，不合法时按“不存在”处理。 */
export function parseId(value) {
  if (!/^[1-9]\d{0,15}$/.test(String(value))) throw new HttpError(404, '内容不存在');
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new HttpError(404, '内容不存在');
  return id;
}

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * 从 root 目录读取静态文件；relativePath 已去掉 URL 前缀。
 * 只提供已知类型、非隐藏文件，并支持 ETag 协商缓存。
 */
export function serveStatic(req, res, root, relativePath) {
  let decoded;
  try {
    decoded = decodeURIComponent(relativePath);
  } catch {
    throw new HttpError(404, '文件不存在');
  }
  const segments = decoded.split('/');
  if (segments.some((s) => s === '' || s.startsWith('.') || s.includes('\\') || s.includes('\0'))) {
    throw new HttpError(404, '文件不存在');
  }
  const base = resolve(root);
  const file = resolve(base, ...segments);
  const type = MIME_TYPES[extname(file).toLowerCase()];
  if (!file.startsWith(base + sep) || !type) throw new HttpError(404, '文件不存在');
  let stat;
  try {
    stat = statSync(file);
  } catch {
    throw new HttpError(404, '文件不存在');
  }
  if (!stat.isFile()) throw new HttpError(404, '文件不存在');

  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const headers = {
    'Content-Type': type,
    'Cache-Control': 'public, max-age=300, must-revalidate',
    ETag: etag,
    'Last-Modified': stat.mtime.toUTCString(),
  };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = createReadStream(file);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}
