// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

// 学堂在线页面脚本：所有操作都调用同一套 JSON 接口，权限由服务端判断。
'use strict';

(() => {
  class ApiError extends Error {
    constructor(status, message, fields) {
      super(message);
      this.status = status;
      this.fields = fields || {};
    }
  }

  async function api(path, { method = 'GET', body } = {}) {
    let response;
    try {
      response = await fetch(path, {
        method,
        headers: method === 'GET' ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: body === undefined ? (method === 'GET' ? undefined : '{}') : JSON.stringify(body),
        credentials: 'same-origin',
      });
    } catch {
      throw new ApiError(0, '网络连接失败，请确认服务仍在运行后重试。');
    }
    let data = null;
    try { data = await response.json(); } catch { /* 非 JSON 响应 */ }
    if (!response.ok) {
      throw new ApiError(response.status, (data && data.error) || `操作未完成（${response.status}），请重试。`, data && data.fields);
    }
    return data;
  }

  function announce(text) {
    const region = document.getElementById('global-status');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(() => { region.textContent = text; }, 50);
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    if (busy) button.setAttribute('aria-busy', 'true');
    else button.removeAttribute('aria-busy');
  }

  /** 在 role=status/alert 的消息区显示提示；kind 为 info、success、danger。 */
  function showMessage(element, text, kind = 'info') {
    if (!element) return;
    element.hidden = !text;
    element.textContent = text || '';
    element.className = `callout callout-${kind === 'info' ? 'accent' : kind}`;
    element.setAttribute('role', kind === 'danger' ? 'alert' : 'status');
  }

  // 各页面的初始化函数，键与 <body data-page> 一致。
  const pages = {};

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (pages[page]) pages[page]();
  });
})();
