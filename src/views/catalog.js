// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { html } from './html.js';
import { layout } from './layout.js';

export function catalogPage({ user, path }) {
  return layout({
    title: '课程目录',
    page: 'catalog',
    user,
    path,
    content: html`<section class="container hero">
  <div class="hero-copy">
    <p class="eyebrow">学堂在线 · 视频课程</p>
    <h1>边看边做，把想法变成作品。</h1>
    <p class="lead">课程目录正在准备中。</p>
  </div>
</section>`,
  });
}
