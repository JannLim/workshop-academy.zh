// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { html, raw } from './html.js';
import { layout } from './layout.js';
import { coverSvg } from './cover.js';
import { courseCode, formatClock, formatDuration } from './format.js';

export function courseCard(course) {
  return html`<li>
  <a class="card course-card" href="${course.url}">
    <span class="course-cover">
      <img src="${course.coverUrl}" alt="" width="320" height="180" loading="lazy">
      <span class="course-duration mono" aria-label="时长 ${formatDuration(course.durationSeconds)}">${formatClock(course.durationSeconds)}</span>
    </span>
    <span class="course-body">
      <span class="course-tags"><span class="tag">${course.levelLabel}</span><span class="course-code mono">${courseCode(course.id)}</span></span>
      <span class="course-title">${course.title}</span>
      <span class="course-summary">${course.summary}</span>
      <span class="course-foot">
        <span class="instructor"><span class="avatar avatar-sm" aria-hidden="true">${[...course.instructor][0]}</span>${course.instructor}</span>
        <span class="course-go" aria-hidden="true">查看课程 →</span>
      </span>
    </span>
  </a>
</li>`;
}

function heroArt() {
  return html`<div class="hero-art" aria-hidden="true">
  <div class="hero-screen">${raw(coverSvg(2026))}<span class="hero-play"></span></div>
  <div class="hero-progress"><i></i></div>
  <span class="hero-chip hero-chip-a">本地视频</span>
  <span class="hero-chip hero-chip-b">一步步动手</span>
</div>`;
}

export function catalogPage({ user, path, courses }) {
  const totalSeconds = courses.reduce((sum, c) => sum + c.durationSeconds, 0);
  return layout({
    title: '课程目录',
    page: 'catalog',
    user,
    path,
    content: html`<section class="container hero">
  <div class="hero-copy">
    <p class="eyebrow">学堂在线 · 视频课程</p>
    <h1>边看边做，<br>把想法变成作品。</h1>
    <p class="lead">挑一门课，跟着视频一步步动手。${user ? '' : '课程目录对所有人开放，登录后即可观看。'}</p>
    <dl class="hero-stats">
      <div><dt>已发布课程</dt><dd class="mono">${courses.length}</dd></div>
      <div><dt>视频总时长</dt><dd class="mono">${formatClock(totalSeconds)}</dd></div>
    </dl>
    ${user ? '' : html`<div class="actions"><a class="btn btn-primary" href="/login">登录开始学习</a><a class="btn" href="#courses">先看看课程</a></div>`}
  </div>
  ${heroArt()}
</section>
<hr class="pixel-rule container-rule">
<section class="container catalog" id="courses" aria-labelledby="catalog-title">
  <div class="section-head">
    <h2 id="catalog-title">全部课程</h2>
    <p class="muted">共 ${courses.length} 门</p>
  </div>
  ${courses.length
    ? html`<ul class="course-grid">${courses.map(courseCard)}</ul>`
    : html`<div class="empty-state dither"><h3>还没有已发布的课程</h3><p class="muted">管理员发布课程后会出现在这里。</p></div>`}
</section>`,
  });
}
