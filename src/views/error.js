// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { html } from './html.js';
import { layout, loginHref } from './layout.js';

const TITLES = {
  400: '请求无效',
  401: '需要登录',
  403: '没有访问权限',
  404: '页面不存在',
  405: '请求方法不支持',
  413: '内容过大',
  415: '格式不支持',
  500: '服务暂时不可用',
};

const HINTS = {
  403: '这个页面只对管理员开放。如果你有管理员账号，可以换个账号登录。',
  404: '链接可能写错了，或者这门课程还没有发布。',
  500: '服务遇到了意外问题，请稍后刷新重试；如果一直出现，请查看服务终端的输出。',
};

/** 补上句末标点，让各种来源的说明读起来一致。 */
function sentence(text) {
  return /[。！？.!?]$/.test(text) ? text : `${text}。`;
}

// 有现成说明的状态一律用说明；其他状态显示服务端给出的原因。
export function errorPage({ status, message, user = null, path = '/' }) {
  const title = TITLES[status] || '出错了';
  const hint = HINTS[status >= 500 ? 500 : status]
    ?? (message && message !== title ? sentence(message) : '请返回课程目录继续浏览。');
  return layout({
    title,
    page: 'error',
    user,
    path,
    content: html`<section class="container error-page" aria-labelledby="error-title">
  <div class="error-code dither" aria-hidden="true"><span>${status}</span></div>
  <div class="error-copy">
    <p class="eyebrow">错误 ${status}</p>
    <h1 id="error-title">${title}</h1>
    <p class="lead">${hint}</p>
    <div class="actions">
      <a class="btn btn-primary" href="/">返回课程目录</a>
      ${status === 403 || status === 401 ? html`<a class="btn" href="${loginHref(path)}">换个账号登录</a>` : ''}
    </div>
  </div>
</section>`,
  });
}
