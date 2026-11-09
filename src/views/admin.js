// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { html } from './html.js';
import { layout } from './layout.js';
import { LEVEL_LABELS, courseCode, formatClock, formatDateTime } from './format.js';

function statusBadge(published) {
  return published
    ? html`<span class="badge badge-success" data-role="status">已发布</span>`
    : html`<span class="badge badge-warning" data-role="status">草稿</span>`;
}

function adminRow(course) {
  return html`<li class="admin-row card" data-course-id="${course.id}" data-published="${course.published ? '1' : '0'}">
  <img class="admin-thumb" src="${course.coverUrl}" alt="" width="128" height="72" loading="lazy">
  <div class="admin-main">
    <p class="admin-heading">
      <span class="course-code mono">${courseCode(course.id)}</span>
      ${statusBadge(course.published)}
    </p>
    <h3 class="admin-title"><a href="/admin/courses/${course.id}/edit">${course.title}</a></h3>
    <p class="admin-meta">
      <span>${course.levelLabel}</span>
      <span>${course.instructor}</span>
      <span class="mono">${formatClock(course.durationSeconds)}</span>
      <span class="mono">${course.videoFile}</span>
      <span>更新于 <span class="mono" data-role="updated">${formatDateTime(course.updatedAt)}</span></span>
    </p>
  </div>
  <div class="admin-actions">
    <a class="btn btn-sm" href="/admin/courses/${course.id}/edit">编辑</a>
    <button class="btn btn-sm ${course.published ? '' : 'btn-primary'}" type="button" data-action="toggle-publish">${course.published ? '取消发布' : '发布'}</button>
    <a class="btn btn-ghost btn-sm" href="${course.url}" data-role="view"${course.published ? '' : html` aria-hidden="true" tabindex="-1"`}>查看 →</a>
  </div>
  <p class="admin-row-message" data-role="message" hidden></p>
</li>`;
}

export function adminListPage({ user, path, courses, notice }) {
  const published = courses.filter((c) => c.published).length;
  return layout({
    title: '课程管理',
    page: 'admin',
    user,
    path,
    content: html`<section class="container admin-page">
  <header class="page-head">
    <div class="page-head-copy">
      <p class="eyebrow">管理员工作台</p>
      <h1>课程管理</h1>
      <p class="muted" id="admin-summary">共 <span data-count="all">${courses.length}</span> 门课程，已发布 <span data-count="published">${published}</span> 门，草稿 <span data-count="draft">${courses.length - published}</span> 门。</p>
    </div>
    <a class="btn btn-primary" href="/admin/courses/new">新建课程</a>
  </header>
  ${notice ? html`<p class="callout callout-success" role="status"><span><strong>${notice.course.title}</strong> ${notice.kind === 'created' ? '已创建' : '已保存'}${notice.course.published ? '，并已发布到课程目录。' : '，目前是草稿，发布后才会出现在目录中。'}</span></p>` : ''}
  ${courses.length
    ? html`<ul class="admin-list" aria-label="全部课程">${courses.map(adminRow)}</ul>`
    : html`<div class="empty-state dither"><h3>还没有课程</h3><p class="muted">先创建一门课程，准备好后再发布。</p><a class="btn btn-primary" href="/admin/courses/new">新建课程</a></div>`}
</section>`,
  });
}

function textField({ name, label, value = '', max, hint, multiline = false, rows = 3, required = true }) {
  const describedBy = `${name}-error${hint ? ` ${name}-hint` : ''}`;
  return html`<div class="field">
  <label for="${name}">${label}${required ? '' : html` <span class="optional">选填</span>`}</label>
  ${multiline
    ? html`<textarea class="input" id="${name}" name="${name}" rows="${rows}" maxlength="${max}" aria-describedby="${describedBy}"${required ? html` required` : ''}>${value}</textarea>`
    : html`<input class="input" id="${name}" name="${name}" type="text" value="${value}" maxlength="${max}" aria-describedby="${describedBy}"${required ? html` required` : ''}>`}
  ${hint ? html`<p class="field-hint" id="${name}-hint">${hint}</p>` : ''}
  <p class="field-error" id="${name}-error" hidden></p>
</div>`;
}

export function courseFormPage({ user, path, course }) {
  const editing = Boolean(course);
  const title = editing ? `编辑《${course.title}》` : '新建课程';
  return layout({
    title,
    page: 'course-form',
    user,
    path,
    content: html`<section class="container form-page">
  <nav class="breadcrumb" aria-label="位置"><a href="/admin">课程管理</a><span aria-hidden="true">/</span><span aria-current="page">${editing ? course.title : '新建课程'}</span></nav>
  <header class="page-head">
    <div class="page-head-copy">
      <p class="eyebrow">${editing ? courseCode(course.id) : '新课程'}</p>
      <h1>${editing ? '编辑课程' : '新建课程'}</h1>
      <p class="muted">${editing ? '保存后立即生效；已发布的课程会同步更新目录。' : '先保存为草稿，确认无误后再发布到课程目录。'}</p>
    </div>
    ${editing && course.published ? html`<a class="btn" href="${course.url}">在目录中查看</a>` : ''}
  </header>
  <form class="panel form course-form" id="course-form" novalidate data-course-id="${editing ? course.id : ''}">
    <p class="callout callout-danger" id="form-message" hidden></p>
    ${textField({ name: 'title', label: '课程标题', value: course?.title, max: 80, hint: '不超过 80 个字，会显示在目录卡片和详情页。' })}
    ${textField({ name: 'summary', label: '一句话简介', value: course?.summary, max: 200, multiline: true, rows: 2, hint: '不超过 200 个字，显示在目录卡片上。' })}
    ${textField({ name: 'description', label: '课程介绍', value: course?.description, max: 5000, multiline: true, rows: 7, required: false, hint: '用空行分段。' })}
    <div class="form-grid">
      ${textField({ name: 'instructor', label: '讲师', value: course?.instructor, max: 40 })}
      <div class="field">
        <label for="level">难度</label>
        <select class="input" id="level" name="level" required aria-describedby="level-error">
          <option value=""${course ? '' : html` selected`}>请选择</option>
          ${Object.entries(LEVEL_LABELS).map(([value, label]) => html`<option value="${value}"${course?.level === value ? html` selected` : ''}>${label}</option>`)}
        </select>
        <p class="field-error" id="level-error" hidden></p>
      </div>
    </div>
    <div class="field">
      <label for="videoFile">课程视频</label>
      <select class="input" id="videoFile" name="videoFile" required disabled data-current="${course?.videoFile ?? ''}" aria-describedby="videoFile-hint videoFile-error">
        <option value="">正在读取 media/ 中的视频…</option>
      </select>
      <p class="field-hint" id="videoFile-hint">从项目的 media/ 目录选择，课程时长按视频自动计算。</p>
      <p class="field-error" id="videoFile-error" hidden></p>
    </div>
    <label class="check"><input type="checkbox" name="published"${course?.published ? html` checked` : ''}> ${editing ? '已发布（取消勾选即下架）' : '保存后立即发布'}</label>
    <div class="actions form-actions">
      <button class="btn btn-primary" type="submit">${editing ? '保存修改' : '创建课程'}</button>
      <a class="btn" href="/admin">取消</a>
    </div>
  </form>
</section>`,
  });
}
