// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** 已转义、可直接输出的 HTML 片段。 */
export class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function render(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(value);
}

/** 模板标签：插值默认转义，SafeHtml 与数组按片段拼接。属性值请始终加引号。 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** 仅用于本项目自己生成、可信的标记（如内联 SVG）。 */
export function raw(markup) {
  return new SafeHtml(String(markup));
}
