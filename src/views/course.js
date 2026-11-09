// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { html } from './html.js';
import { layout, loginHref } from './layout.js';
import { courseCode, formatDate, formatDuration, paragraphs } from './format.js';

/**
 * 播放面板的初始状态，由服务端的观看资格决定：
 * login 未登录；ready 可以观看；其他状态显示 watch.message。
 */
function playerOverlay(course, watch, path) {
  if (watch.state === 'login') {
    return html`<div class="player-state">
      <span class="pixel-icon pixel-lock" aria-hidden="true"></span>
      <p class="player-title">登录后观看视频</p>
      <p class="player-note">课程介绍对所有人开放</p>
      <a class="btn btn-primary btn-lg" href="${loginHref(path)}">去登录</a>
    </div>`;
  }
  if (watch.state === 'ready') {
    return html`<div class="player-state">
      <button class="play-button" type="button" data-action="watch" aria-describedby="player-message">
        <span class="pixel-icon pixel-play" aria-hidden="true"></span>
        <span>开始观看</span>
      </button>
      <p class="player-note">时长 ${formatDuration(course.durationSeconds)}</p>
    </div>`;
  }
  return html`<div class="player-state">
    <span class="pixel-icon pixel-lock" aria-hidden="true"></span>
    <p class="player-title">${watch.message || '暂时不能观看'}</p>
  </div>`;
}

export function coursePage({ user, path, course, watch }) {
  return layout({
    title: course.title,
    page: 'course',
    user,
    path,
    content: html`<article class="container course-page">
  <nav class="breadcrumb" aria-label="位置"><a href="/">课程目录</a><span aria-hidden="true">/</span><span aria-current="page">${course.title}</span></nav>
  <header class="course-header">
    <p class="course-tags"><span class="tag">${course.levelLabel}</span><span class="course-code mono">${courseCode(course.id)}</span></p>
    <h1>${course.title}</h1>
    <p class="lead">${course.summary}</p>
  </header>
  <div class="course-layout">
    <section class="player-column" aria-label="课程视频">
      <div class="player block" data-course-id="${course.id}" data-state="${watch.state}">
        <img class="player-poster" src="${course.coverUrl}" alt="" width="640" height="360">
        <div class="player-overlay">${playerOverlay(course, watch, path)}</div>
        <video class="player-video" controls playsinline preload="auto" hidden aria-label="${course.title} 视频"></video>
      </div>
      <p class="player-message" id="player-message" role="status" aria-live="polite"></p>
    </section>
    <aside class="course-aside panel" aria-label="课程信息">
      <dl class="meta-list">
        <div><dt>讲师</dt><dd><span class="avatar avatar-sm" aria-hidden="true">${[...course.instructor][0]}</span>${course.instructor}</dd></div>
        <div><dt>难度</dt><dd>${course.levelLabel}</dd></div>
        <div><dt>时长</dt><dd>${formatDuration(course.durationSeconds)}</dd></div>
        <div><dt>更新于</dt><dd class="mono">${formatDate(course.updatedAt)}</dd></div>
      </dl>
    </aside>
    <section class="course-description" aria-labelledby="about-title">
      <h2 id="about-title">课程介绍</h2>
      ${paragraphs(course.description).map((p) => html`<p>${p}</p>`)}
    </section>
  </div>
</article>`,
  });
}
