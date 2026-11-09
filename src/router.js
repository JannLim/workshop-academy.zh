// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { HttpError } from './http.js';

function compile(pattern) {
  let source = '';
  const names = [];
  for (const part of pattern.split(/(:[a-zA-Z]+|\*)/)) {
    if (part === '*') {
      names.push('rest');
      source += '(.+)';
    } else if (part.startsWith(':')) {
      names.push(part.slice(1));
      source += '([^/]+?)';
    } else {
      source += part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return { regex: new RegExp(`^${source}$`), names };
}

/**
 * 极简路由表：add('GET', '/courses/:id', handler)。
 * GET 路由自动接受 HEAD；路径匹配但方法不符时返回 405。
 */
export class Router {
  #routes = [];

  add(methods, pattern, handler) {
    const list = Array.isArray(methods) ? methods : [methods];
    const allowed = new Set(list);
    if (allowed.has('GET')) allowed.add('HEAD');
    this.#routes.push({ methods: allowed, pattern, handler, ...compile(pattern) });
    return this;
  }

  get(pattern, handler) { return this.add('GET', pattern, handler); }
  post(pattern, handler) { return this.add('POST', pattern, handler); }
  patch(pattern, handler) { return this.add('PATCH', pattern, handler); }

  /** 返回 { handler, params }；无匹配返回 null；方法不符抛出 405。 */
  match(method, pathname) {
    const allowed = new Set();
    for (const route of this.#routes) {
      const found = route.regex.exec(pathname);
      if (!found) continue;
      if (!route.methods.has(method)) {
        route.methods.forEach((m) => allowed.add(m));
        continue;
      }
      const params = {};
      route.names.forEach((name, index) => { params[name] = found[index + 1]; });
      return { handler: route.handler, params, pattern: route.pattern };
    }
    if (allowed.size) {
      throw new HttpError(405, '不支持这种请求方法', { headers: { Allow: [...allowed].join(', ') } });
    }
    return null;
  }
}
