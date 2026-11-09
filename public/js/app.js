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

  // ---------- 表单字段错误 ----------
  function setFieldError(form, name, message) {
    const input = form.elements.namedItem(name);
    const error = form.querySelector(`#${name}-error`);
    if (input && input.setAttribute) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
    if (error) {
      error.textContent = message || '';
      error.hidden = !message;
    }
  }

  function clearFieldErrors(form) {
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; el.hidden = true; });
  }

  /** 显示一组字段错误，并把焦点放到第一个出错的字段。 */
  function showFieldErrors(form, fields) {
    let first = null;
    for (const [name, message] of Object.entries(fields)) {
      setFieldError(form, name, message);
      const input = form.elements.namedItem(name);
      if (!first && input && input.focus) first = input;
    }
    if (first) first.focus();
    return Boolean(first);
  }

  // 各页面的初始化函数，键与 <body data-page> 一致。
  const pages = {};

  // ---------- 退出登录（所有页面顶栏） ----------
  function initLogout() {
    const button = document.querySelector('[data-action="logout"]');
    if (!button) return;
    button.addEventListener('click', async () => {
      setBusy(button, true);
      try {
        await api('/api/logout', { method: 'POST' });
        window.location.assign('/');
      } catch (error) {
        setBusy(button, false);
        announce(error.message);
        window.alert(error.message);
      }
    });
  }

  // ---------- 登录页 ----------
  pages.login = () => {
    const form = document.getElementById('login-form');
    if (!form) return;
    const message = document.getElementById('login-message');
    const submit = form.querySelector('button[type="submit"]');
    const next = form.dataset.next || '/';

    async function login() {
      clearFieldErrors(form);
      showMessage(message, '');
      const username = form.elements.username.value.trim();
      const password = form.elements.password.value;
      const missing = {};
      if (!username) missing.username = '请输入用户名';
      if (!password) missing.password = '请输入密码';
      if (showFieldErrors(form, missing)) return;

      setBusy(submit, true);
      try {
        await api('/api/login', { method: 'POST', body: { username, password } });
        submit.textContent = '登录成功，正在跳转…';
        window.location.assign(next);
      } catch (error) {
        setBusy(submit, false);
        if (error.fields && showFieldErrors(form, error.fields)) return;
        showMessage(message, error.message, 'danger');
        const field = error.status === 401 ? form.elements.password : form.elements.username;
        field.focus();
        if (field.select) field.select();
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      login();
    });
    form.addEventListener('input', (event) => {
      if (event.target.name) setFieldError(form, event.target.name, '');
    });

    const list = document.querySelector('.account-list');
    if (list) {
      list.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-username]');
        if (!chip) return;
        form.elements.username.value = chip.dataset.username;
        form.elements.password.value = list.dataset.password || '';
        login();
      });
    }
    form.elements.username.focus();
  };

  document.addEventListener('DOMContentLoaded', () => {
    initLogout();
    const page = document.body.dataset.page;
    if (pages[page]) pages[page]();
  });
})();
