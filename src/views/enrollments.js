// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 liyan <1982119376@qq.com>

import { html } from './html.js';
import { layout } from './layout.js';
import { courseCode, formatDateTime } from './format.js';

function enrollmentRow(item) {
  const published = item.status === 'published';
  return html`<li class="enrollment-row card" data-course-id="${item.courseId}" data-status="${item.status}">
  <img class="enrollment-cover" src="/covers/${item.courseId}.svg" alt="" width="128" height="72" loading="lazy">
  <div class="enrollment-main">
    <p class="enrollment-heading">
      <span class="course-code mono">${courseCode(item.courseId)}</span>
      ${published
        ? html`<span class="badge badge-success">已发布</span>`
        : html`<span class="badge badge-warning">已下架</span>`}
    </p>
    <h2 class="enrollment-title">${item.title}</h2>
    <p class="enrollment-meta">报名于 <span class="mono">${formatDateTime(item.enrolledAt)}</span>${published ? '' : ' · 课程暂不可用'}</p>
  </div>
  <div class="enrollment-actions">
    ${published ? html`<a class="btn btn-sm" href="${item.url}">查看课程</a>` : ''}
    <button class="btn btn-sm btn-ghost" type="button" data-action="cancel-enrollment" data-course-id="${item.courseId}">取消报名</button>
  </div>
</li>`;
}

export function enrollmentsPage({ user, path, enrollments }) {
  return layout({
    title: '我的报名',
    page: 'enrollments',
    user,
    path,
    content: html`<section class="container enrollment-page">
  <header class="page-head">
    <div class="page-head-copy">
      <p class="eyebrow">学习中心</p>
      <h1>我的报名</h1>
      <p class="muted">共 ${enrollments.length} 门课程。取消报名后将不能再取得新的播放地址。</p>
    </div>
    <a class="btn" href="/">返回课程目录</a>
  </header>
  ${enrollments.length
    ? html`<ul class="enrollment-list" data-enrollment-list aria-label="我的报名">${enrollments.map(enrollmentRow)}</ul>`
    : html`<div class="empty-state dither" data-enrollment-empty><h2>还没有报名</h2><p class="muted">去课程目录挑一门课，报名后即可观看。</p><a class="btn btn-primary" href="/">浏览课程</a></div>`}
  <p class="callout callout-accent" id="enrollment-message" role="status" hidden></p>
</section>`,
  });
}