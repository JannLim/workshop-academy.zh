// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { html } from './html.js';
import { layout, ROLE_LABELS } from './layout.js';

function accountButton(account) {
  return html`<li>
    <button class="account-chip" type="button" data-username="${account.username}">
      <span class="avatar" aria-hidden="true">${[...account.displayName][0]}</span>
      <span class="account-text">
        <span class="account-name">${account.displayName}<span class="badge ${account.role === 'admin' ? 'badge-accent' : ''}">${ROLE_LABELS[account.role]}</span></span>
        <code class="account-username">${account.username}</code>
      </span>
      <span class="account-go" aria-hidden="true">登录 →</span>
      <span class="sr-only">，以 ${account.displayName} 的身份一键登录</span>
    </button>
  </li>`;
}

function intro(user, next) {
  if (user) {
    return html`<p class="callout callout-accent" id="login-current"><span>当前已登录为 <strong>${user.displayName || user.username}</strong>（${ROLE_LABELS[user.role] || user.role}）。登录其他账号会替换当前会话。</span></p>`;
  }
  return html`<p class="muted">${next !== '/' ? '登录后会回到你刚才浏览的页面。' : '登录后即可观看已发布的课程。'}</p>`;
}

/** user 不为空时是换账号登录：顶栏仍显示当前账号，表单上方说明会替换会话。 */
export function loginPage({ next = '/', path = '/login', user = null, accounts = [], password = '' }) {
  return layout({
    title: user ? '换个账号登录' : '登录',
    page: 'login',
    user,
    path,
    content: html`<section class="container auth-layout">
  <div class="panel auth-panel">
    <p class="eyebrow">${user ? '切换账号' : '欢迎回来'}</p>
    <h1>登录学堂在线</h1>
    ${intro(user, next)}
    <form class="form" id="login-form" data-next="${next}" novalidate>
      <div class="field">
        <label for="username">用户名</label>
        <input class="input" id="username" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="64" required aria-describedby="username-error">
        <p class="field-error" id="username-error" hidden></p>
      </div>
      <div class="field">
        <label for="password">密码</label>
        <input class="input" id="password" name="password" type="password" autocomplete="current-password" maxlength="200" required aria-describedby="password-error">
        <p class="field-error" id="password-error" hidden></p>
      </div>
      <p class="callout callout-danger" id="login-message" hidden></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">登录</button>
    </form>
  </div>
  ${accounts.length ? html`<aside class="demo-accounts" aria-labelledby="demo-title">
    <h2 id="demo-title">课堂示例账号</h2>
    <p class="muted">点一下即可登录${password ? html`，密码均为 <code>${password}</code>` : ''}。</p>
    <ul class="account-list" data-password="${password}">${accounts.map(accountButton)}</ul>
  </aside>` : ''}
</section>`,
  });
}
