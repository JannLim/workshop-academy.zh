// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { HttpError, parseId, sendHtml, sendJson } from './http.js';
import { LEVEL_LABELS } from './views/format.js';
import { coverSvg } from './views/cover.js';
import { catalogPage } from './views/catalog.js';
import { coursePage } from './views/course.js';

export const LEVELS = Object.keys(LEVEL_LABELS);

export function listPublishedCourses(db) {
  return db.prepare('SELECT * FROM courses WHERE published = 1 ORDER BY id').all();
}

/** 只返回已发布的课程；草稿与不存在的课程对外一视同仁。 */
export function getPublishedCourse(db, id) {
  return db.prepare('SELECT * FROM courses WHERE id = ? AND published = 1').get(id) ?? null;
}

export function getCourse(db, id) {
  return db.prepare('SELECT * FROM courses WHERE id = ?').get(id) ?? null;
}

/** 对外的课程字段；admin 为真时附带发布状态、视频文件与创建时间。 */
export function publicCourse(row, { admin = false } = {}) {
  const course = {
    id: row.id,
    title: row.title,
    summary: row.summary,
    description: row.description,
    instructor: row.instructor,
    level: row.level,
    levelLabel: LEVEL_LABELS[row.level] ?? row.level,
    durationSeconds: row.duration_seconds,
    published: row.published === 1,
    url: `/courses/${row.id}`,
    coverUrl: `/covers/${row.id}.svg`,
    updatedAt: row.updated_at,
  };
  if (admin) {
    course.videoFile = row.video_file;
    course.createdAt = row.created_at;
  }
  return course;
}

function requirePublishedCourse(db, rawId) {
  const course = getPublishedCourse(db, parseId(rawId));
  if (!course) throw new HttpError(404, '课程不存在或尚未发布');
  return course;
}

export function registerCourseRoutes(app, { watchState }) {
  const { router } = app;

  router.get('/', (ctx) => {
    const courses = listPublishedCourses(ctx.db).map((row) => publicCourse(row));
    sendHtml(ctx.res, 200, catalogPage({ user: ctx.user, path: ctx.path, courses }));
  });

  router.get('/courses/:id', (ctx) => {
    const course = requirePublishedCourse(ctx.db, ctx.params.id);
    sendHtml(ctx.res, 200, coursePage({
      user: ctx.user,
      path: ctx.path,
      course: publicCourse(course),
      watch: watchState(ctx, course),
    }));
  });

  router.get('/api/courses', (ctx) => {
    sendJson(ctx.res, 200, { courses: listPublishedCourses(ctx.db).map((row) => publicCourse(row)) });
  });

  router.get('/api/courses/:id', (ctx) => {
    sendJson(ctx.res, 200, { course: publicCourse(requirePublishedCourse(ctx.db, ctx.params.id)) });
  });

  // 封面只由编号决定，不涉及课程内容，草稿也可以显示。
  router.get('/covers/:id.svg', (ctx) => {
    const svg = coverSvg(parseId(ctx.params.id));
    ctx.res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Content-Length': Buffer.byteLength(svg),
      'Cache-Control': 'public, max-age=3600',
    });
    ctx.res.end(svg);
  });
}
