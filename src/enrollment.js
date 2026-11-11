// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com>

import { enrollmentsPage } from './views/enrollments.js';
import { requireUser } from './auth.js';
import { HttpError, parseId, readJson, sendJson, sendHtml, redirect } from './http.js';

export function requireStudent(ctx) {
  const user = requireUser(ctx);
  if (user.role !== 'student') throw new HttpError(403, '报名仅面向学员');
  return user;
}

export function hasEnrollment(db, userId, courseId) {
  return Boolean(db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId));
}

export function listEnrollments(db, userId) {
  return db.prepare(`SELECT c.id AS courseId, c.title, c.published FROM enrollments e
    JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? ORDER BY c.id`).all(userId)
    .map(({ courseId, title, published }) => ({ courseId, title, available: published === 1 }));
}

export function registerEnrollmentRoutes(app) {
  app.router.get('/enrollments', (ctx) => {
    if (!ctx.user) { redirect(ctx.res, '/login?next=%2Fenrollments'); return; }
    const user = requireStudent(ctx);
    sendHtml(ctx.res, 200, enrollmentsPage({ user, path: ctx.path, enrollments: listEnrollments(ctx.db, user.id) }));
  });
  app.router.get('/api/enrollments', (ctx) => {
    const user = requireStudent(ctx);
    sendJson(ctx.res, 200, { enrollments: listEnrollments(ctx.db, user.id) });
  });
  app.router.add(['POST', 'DELETE'], '/api/courses/:id/enrollment', async (ctx) => {
    const user = requireStudent(ctx);
    const body = await readJson(ctx.req);
    if (Object.keys(body).length) throw new HttpError(400, '报名操作不接受附加字段');
    const courseId = parseId(ctx.params.id);
    const course = ctx.db.prepare('SELECT published FROM courses WHERE id = ?').get(courseId);
    if (!course || (ctx.req.method === 'POST' && !course.published)) {
      throw new HttpError(404, '课程不存在或尚未发布');
    }
    if (ctx.req.method === 'POST') {
      ctx.db.prepare('INSERT INTO enrollments (user_id, course_id, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id, course_id) DO NOTHING')
        .run(user.id, courseId, Date.now());
    } else {
      ctx.db.prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?').run(user.id, courseId);
    }
    sendJson(ctx.res, 200, { enrolled: ctx.req.method === 'POST' });
  });
}
