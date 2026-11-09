// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { raw } from './html.js';

// 学堂在线的像素标志：带硬边投影的播放块，下方是一条进度条。
export const LOGO_SVG = `<svg class="logo" viewBox="0 0 13 13" width="26" height="26" aria-hidden="true" focusable="false" shape-rendering="crispEdges">
  <path fill="#27063D" d="M2 1h10v12H2zM1 2h12v10H1z"/>
  <path fill="#890FBC" d="M1 0h10v12H1zM0 1h12v10H0z"/>
  <path fill="#FFFFFF" d="M5 2h1v6H5zM6 3h1v4H6zM7 4h1v2H7z"/>
  <path fill="#5B0F84" d="M2 9h8v1H2z"/>
  <path fill="#FFFFFF" d="M2 9h3v1H2z"/>
</svg>`;

export function logo() {
  return raw(LOGO_SVG);
}
