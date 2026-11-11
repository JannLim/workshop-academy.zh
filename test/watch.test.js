// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { projectRoot } from '../src/db.js';
import { demoCourses } from '../src/seed.js';
import { listVideos, readMp4Duration } from '../src/playback.js';
import { client, login, startApp } from './helpers.js';

const mediaDir = resolve(projectRoot, 'media');

test('示例视频齐全，时长与种子课程一致，体积小', () => {
  const videos = listVideos(mediaDir);
  assert.deepEqual(videos.map((v) => v.file).sort(), demoCourses.map((c) => c.videoFile).sort());
  for (const course of demoCourses) {
    const file = resolve(mediaDir, course.videoFile);
    assert.equal(readMp4Duration(file), course.durationSeconds, course.videoFile);
    assert.ok(statSync(file).size < 400 * 1024, `${course.videoFile} 应小于 400 KB`);
  }
});

test('取得播放地址需要登录且课程已发布', async (t) => {
  const app = await startApp(t);
  const guest = client(app.url);
  const anonymous = await guest.post('/api/courses/1/play');
  assert.equal(anonymous.status, 401);
  assert.deepEqual(await anonymous.json(), { error: '请先登录后再观看' });

  const student = client(app.url);
  await login(student);
  for (const id of [1, 2, 3]) await student.post(`/api/courses/${id}/enrollment`);
  for (const id of [4, 999]) {
    const response = await student.post(`/api/courses/${id}/play`);
    assert.equal(response.status, 404, String(id));
    assert.equal((await response.json()).error, '课程不存在或尚未发布');
  }
  const before = Date.now();
  const response = await student.post('/api/courses/1/play');
  assert.equal(response.status, 200);
  const grant = await response.json();
  assert.deepEqual(Object.keys(grant).sort(), ['expiresAt', 'url']);
  assert.match(grant.url, /^\/media\/1\?expires=\d+&signature=[0-9a-f]{64}$/);
  assert.ok(grant.expiresAt >= before + 59_000 && grant.expiresAt <= Date.now() + 60_000);
  assert.equal(Number(new URL(grant.url, app.url).searchParams.get('expires')), grant.expiresAt);

  app.db.prepare('UPDATE courses SET published = 0 WHERE id = 1').run();
  assert.equal((await student.post('/api/courses/1/play')).status, 404, '取消发布后不再签发新地址');
});

test('课程页按同一资格检查显示观看状态', async (t) => {
  const app = await startApp(t);
  const guest = await (await fetch(`${app.url}/courses/2`)).text();
  assert.match(guest, /data-state="login"/);
  assert.doesNotMatch(guest, /data-action="watch"/);

  const student = client(app.url);
  await login(student);
  for (const id of [1, 2, 3]) await student.post(`/api/courses/${id}/enrollment`);
  const page = await (await student.get('/courses/2')).text();
  assert.match(page, /data-state="ready"/);
  assert.match(page, /data-action="watch"/);
  assert.match(page, /<video class="player-video"[^>]* hidden/);
  assert.doesNotMatch(page, /\/media\//, '页面本身不含播放地址');
});

test('签名地址支持范围请求，篡改的地址被拒绝', async (t) => {
  const app = await startApp(t);
  const student = client(app.url);
  await login(student);
  for (const id of [1, 2, 3]) await student.post(`/api/courses/${id}/enrollment`);
  const { url } = await (await student.post('/api/courses/1/play')).json();
  const size = statSync(resolve(mediaDir, 'python-basics.mp4')).size;

  // 视频读取同时携带本人会话和限时授权。
  const part = await student.get(url, { headers: { range: 'bytes=0-31' } });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-type'), 'video/mp4');
  assert.equal(part.headers.get('accept-ranges'), 'bytes');
  assert.equal(part.headers.get('content-range'), `bytes 0-31/${size}`);
  const bytes = Buffer.from(await part.arrayBuffer());
  assert.equal(bytes.length, 32);
  assert.equal(bytes.toString('latin1', 4, 8), 'ftyp');

  const tail = await student.get(url, { headers: { range: 'bytes=-10' } });
  assert.equal(tail.status, 206);
  assert.equal(tail.headers.get('content-range'), `bytes ${size - 10}-${size - 1}/${size}`);
  assert.equal((await tail.arrayBuffer()).byteLength, 10);

  const open = await student.get(url, { headers: { range: 'bytes=100-' } });
  assert.equal(open.headers.get('content-length'), String(size - 100));
  await open.arrayBuffer();

  const whole = await student.get(url);
  assert.equal(whole.status, 200);
  assert.equal((await whole.arrayBuffer()).byteLength, size);

  const head = await student.request(url, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), String(size));

  const beyond = await student.get(url, { headers: { range: `bytes=${size}-` } });
  assert.equal(beyond.status, 416);
  assert.equal(beyond.headers.get('content-range'), `bytes */${size}`);

  const signed = new URL(url, app.url);
  const signature = signed.searchParams.get('signature');
  const expires = signed.searchParams.get('expires');
  const forged = [
    `/media/1?expires=${expires}&signature=${signature.replace(/^./, signature[0] === 'a' ? 'b' : 'a')}`,
    `/media/1?expires=${Number(expires) + 1000}&signature=${signature}`,
    `/media/2?expires=${expires}&signature=${signature}`,
    '/media/1',
    `/media/1?expires=abc&signature=${signature}`,
  ];
  for (const path of forged) {
    const response = await student.get(path);
    assert.equal(response.status, 403, path);
    assert.deepEqual(await response.json(), { error: '播放地址无效' });
  }
  for (const path of ['/media/python-basics.mp4', '/assets/../media/python-basics.mp4', '/media/']) {
    assert.equal((await student.get(path)).status, 404, path);
  }
});

test('播放地址到期后返回 410，重新申请即可继续', async (t) => {
  const app = await startApp(t, { playbackTtlMs: 300 });
  const student = client(app.url);
  await login(student);
  for (const id of [1, 2, 3]) await student.post(`/api/courses/${id}/enrollment`);
  const first = await (await student.post('/api/courses/3/play')).json();
  assert.equal((await student.get(first.url, { headers: { range: 'bytes=0-1' } })).status, 206);
  await sleep(400);
  const expired = await student.get(first.url, { headers: { range: 'bytes=2-3' } });
  assert.equal(expired.status, 410);
  assert.deepEqual(await expired.json(), { error: '播放地址已过期，请重新获取' });
  const renewed = await (await student.post('/api/courses/3/play')).json();
  assert.equal((await student.get(renewed.url, { headers: { range: 'bytes=2-3' } })).status, 206);
});

test('课程的视频文件缺失时返回 404', async (t) => {
  const app = await startApp(t);
  const student = client(app.url);
  await login(student);
  for (const id of [1, 2, 3]) await student.post(`/api/courses/${id}/enrollment`);
  app.db.prepare("UPDATE courses SET video_file = 'missing-video.mp4' WHERE id = 2").run();
  const { url } = await (await student.post('/api/courses/2/play')).json();
  const response = await student.get(url);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: '视频不存在' });
});

test('观看矩阵统一检查身份报名和发布状态，旧地址立即失去资格', async (t) => {
  const app = await startApp(t);
  const a = client(app.url), b = client(app.url), guest = client(app.url), admin = client(app.url);
  await login(a); await login(b, 'student2'); await login(admin, 'admin');
  for (const [c, status] of [[guest, 401], [admin, 403], [a, 403]]) {
    assert.equal((await c.post('/api/courses/1/play')).status, status);
  }
  for (const [c, status] of [[guest, 401], [admin, 403], [a, 404]]) {
    assert.equal((await c.post('/api/courses/abc/play')).status, status);
  }
  await a.post('/api/courses/1/enrollment');
  const { url } = await (await a.post('/api/courses/1/play')).json();
  const read = async (c, expected) => {
    for (const options of [{}, { headers: { range: 'bytes=0-1' } }, { method: 'HEAD' }]) {
      const r = await c.request(url, options);
      assert.equal(r.status, expected === 200 && options.headers ? 206 : expected);
      await r.arrayBuffer();
    }
  };
  await read(guest, 401); await read(admin, 403); await read(b, 403); await read(a, 200);
  await b.post('/api/courses/1/enrollment'); await read(b, 200);
  await a.request('/api/courses/1/enrollment', { method: 'DELETE', json: {} }); await read(a, 403);
  assert.equal((await a.post('/api/courses/1/play')).status, 403);
  await a.post('/api/courses/1/enrollment');
  await admin.patch('/api/admin/courses/1', { published: false }); await read(a, 404);
  await admin.patch('/api/admin/courses/1', { published: true }); await read(a, 200);
  await a.post('/api/logout'); await read(a, 401);
  await login(a);
  app.db.prepare('UPDATE sessions SET expires_at = 0 WHERE user_id = 2').run(); await read(a, 401);
});
