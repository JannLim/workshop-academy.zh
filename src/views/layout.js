// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { html } from './html.js';
import { logo } from './brand.js';

export const ROLE_LABELS = { admin: '管理员', student: '学员' };

export function loginHref(path = '/') {
  return path && path !== '/' && !path.startsWith('/login') ? `/login?next=${encodeURIComponent(path)}` : '/login';
}

// 窄屏只显示“目录”“管理”，前缀“课程”在宽屏显示。
function navLink(href, label, current) {
  return html`<a class="nav-link" href="${href}"${current ? html` aria-current="page"` : ''}><span class="nav-prefix">课程</span>${label}</a>`;
}

function userMenu(user) {
  const name = user.displayName || user.username;
  return html`<div class="user-chip" title="${name}（${user.username}）">
      <span class="avatar" aria-hidden="true">${[...name][0]}</span>
      <span class="user-name">${name}</span>
      <span class="badge ${user.role === 'admin' ? 'badge-accent' : ''}">${ROLE_LABELS[user.role] || user.role}</span>
    </div>
    <button class="btn btn-sm" type="button" data-action="logout">退出</button>`;
}

/** 站点外壳：顶栏、主内容与页脚。page 用于前端脚本选择要初始化的功能。 */
export function layout({ title, page, user = null, path = '/', content }) {
  const section = path.startsWith('/admin') ? 'admin' : path === '/' || path.startsWith('/courses') ? 'catalog' : '';
  return html`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${title ? `${title} · 学堂在线` : '学堂在线'}</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/app.css">
<script src="/assets/js/app.js" defer></script>
</head>
<body data-page="${page}">
<a class="skip-link" href="#main">跳到主要内容</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="学堂在线首页">${logo()}<span class="brand-name">学堂在线</span></a>
    <nav class="site-nav" aria-label="主导航">
      ${navLink('/', '目录', section === 'catalog')}
      ${user?.role === 'student' ? html`<a class="nav-link" href="/enrollments"${path === '/enrollments' ? html` aria-current="page"` : ''}>我的报名</a>` : ''}
      ${user?.role === 'admin' ? navLink('/admin', '管理', section === 'admin') : ''}
    </nav>
    <div class="header-actions">
      ${user ? userMenu(user) : path.startsWith('/login') ? '' : html`<a class="btn btn-sm btn-primary" href="${loginHref(path)}">登录</a>`}
    </div>
  </div>
</header>
<main id="main" class="site-main" tabindex="-1">
${content}
</main>
<footer class="site-footer">
  <div class="container footer-inner">
    <span class="footer-brand">${logo()}<span>学堂在线</span></span>
    <span class="footer-note">在本机运行的课程示例项目 · 数据只保存在你的电脑上</span>
  </div>
</footer>
<p class="sr-only" id="global-status" role="status" aria-live="polite"></p>
</body>
</html>`;
}
