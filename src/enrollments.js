// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 liyan <1982119376@qq.com>

import { requireUser } from './auth.js';
import { HttpError, parseId, redirect, sendHtml, sendJson } from './http.js';
import { enrollmentsPage } from './views/enrollments.js';

/** 当前账号对某课程的报名；不存在时返回 null。 */
export function getEnrollment(db, userId, courseId) {
  return db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId) ?? null;
}

export function hasEnrollment(db, userId, courseId) {
  return Boolean(getEnrollment(db, userId, courseId));
}

/** 当前账号的全部报名，包含课程已下架的记录。 */
export function listEnrollments(db, userId) {
  return db.prepare(`SELECT enrollments.*, courses.title, courses.published
    FROM enrollments JOIN courses ON courses.id = enrollments.course_id
    WHERE enrollments.user_id = ?
    ORDER BY enrollments.created_at DESC, enrollments.id DESC`).all(userId);
}

/** 对外的报名字段；已下架课程不提供详情入口。 */
export function publicEnrollment(row) {
  const enrollment = {
    courseId: row.course_id,
    title: row.title,
    status: row.published ? 'published' : 'unpublished',
    enrolledAt: row.created_at,
  };
  if (row.published) enrollment.url = `/courses/${row.course_id}`;
  return enrollment;
}

function enrollmentRow(db, userId, courseId) {
  return db.prepare(`SELECT enrollments.*, courses.title, courses.published
    FROM enrollments JOIN courses ON courses.id = enrollments.course_id
    WHERE enrollments.user_id = ? AND enrollments.course_id = ?`).get(userId, courseId);
}

/** 报名已发布课程；重复报名成功且不新增记录。 */
export function createEnrollment(db, userId, courseId, now = Date.now()) {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND published = 1').get(courseId);
  if (!course) throw new HttpError(404, '课程不存在或尚未发布');
  const result = db.prepare(`INSERT INTO enrollments (user_id, course_id, created_at)
    VALUES (?, ?, ?) ON CONFLICT (user_id, course_id) DO NOTHING`).run(userId, courseId, now);
  return {
    enrollment: publicEnrollment(enrollmentRow(db, userId, courseId)),
    created: result.changes === 1,
  };
}

/** 取消当前账号的报名；重复取消成功。 */
export function cancelEnrollment(db, userId, courseId) {
  const result = db.prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?').run(userId, courseId);
  return { removed: result.changes === 1 };
}

export function registerEnrollmentRoutes(app) {
  const { router } = app;

  router.get('/enrollments', (ctx) => {
    if (!ctx.user) {
      redirect(ctx.res, `/login?next=${encodeURIComponent('/enrollments')}`);
      return;
    }
    sendHtml(ctx.res, 200, enrollmentsPage({
      user: ctx.user,
      path: ctx.path,
      enrollments: listEnrollments(ctx.db, ctx.user.id).map(publicEnrollment),
    }));
  });

  router.get('/api/enrollments', (ctx) => {
    requireUser(ctx);
    sendJson(ctx.res, 200, { enrollments: listEnrollments(ctx.db, ctx.user.id).map(publicEnrollment) });
  });

  router.post('/api/courses/:id/enrollment', (ctx) => {
    requireUser(ctx);
    const { enrollment, created } = createEnrollment(ctx.db, ctx.user.id, parseId(ctx.params.id));
    sendJson(ctx.res, created ? 201 : 200, { enrollment });
  });

  router.add('DELETE', '/api/courses/:id/enrollment', (ctx) => {
    requireUser(ctx);
    cancelEnrollment(ctx.db, ctx.user.id, parseId(ctx.params.id));
    sendJson(ctx.res, 200, { ok: true });
  });
}