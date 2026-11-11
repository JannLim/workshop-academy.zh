// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com>
import { html } from './html.js';
import { layout } from './layout.js';

export function enrollmentsPage({ user, path, enrollments }) {
  return layout({ title: '我的报名', page: 'enrollments', user, path, content: html`
<section class="container enrollment-page">
  <header class="section-head"><div><p class="eyebrow">我的学习</p><h1>我的报名</h1></div><a class="btn" href="/">浏览课程</a></header>
  <p class="muted">这里保存你的有效报名。取消报名后将失去观看资格，课程发布期间可以重新报名。</p>
  <ul class="enrollment-list"${!enrollments.length ? html` hidden` : ''}>
    ${enrollments.map(e => html`<li class="panel enrollment-row" data-course-id="${e.courseId}">
      <img src="/covers/${e.courseId}.svg" alt="" width="160" height="90">
      <div class="enrollment-info"><h2>${e.title}</h2><span class="badge ${e.available ? 'badge-success' : 'badge-warning'}">${e.available ? '已报名' : '课程暂不可用'}</span></div>
      <div class="actions">${e.available ? html`<a class="btn btn-primary" href="/courses/${e.courseId}">进入课程</a>` : ''}<button class="btn" type="button" data-action="cancel-enrollment">取消报名</button></div>
    </li>`)}
  </ul>
  <div class="empty-state" id="enrollment-empty"${enrollments.length ? html` hidden` : ''}><h2>暂无报名</h2><p>挑选一门课程，开始学习。</p><a class="btn btn-primary" href="/">浏览课程</a></div>
  <p id="enrollment-message" role="status" aria-live="polite" hidden></p>
</section>` });
}
