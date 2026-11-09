// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

// 课程封面：按课程编号生成的像素拼贴，只用紫色色阶，同一编号永远得到同一张图。

const RAMP = ['#27063D', '#5B0F84', '#890FBC', '#B86FDB', '#E3C8F0', '#F6F0F9'];
const COLS = 32;
const ROWS = 18;
const CELL = 5;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rect(x, y, w, h, color) {
  return `<rect x="${x * CELL}" y="${y * CELL}" width="${w * CELL}" height="${h * CELL}" fill="${color}"/>`;
}

/** 有阶梯切角与硬边投影的砖块。 */
function brick(x, y, w, h, face, edge) {
  return [
    rect(x + 1, y + 2, w, h - 1, edge),
    rect(x + 2, y + h, w - 1, 1, edge),
    rect(x + 1, y, w - 2, h, face),
    rect(x, y + 1, w, h - 2, face),
  ].join('');
}

export function coverSvg(id) {
  const random = mulberry32(Math.imul(Number(id) || 0, 2654435761) ^ 0x9E3779B9);
  // 背景：沿随机方向的阶梯渐变，边界处用随机点打散，形成抖动过渡。
  const angle = random() * Math.PI * 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const shades = [RAMP[0], RAMP[1], RAMP[2]];
  const parts = [];
  for (let y = 0; y < ROWS; y += 1) {
    let runStart = 0;
    let runColor = null;
    for (let x = 0; x <= COLS; x += 1) {
      let color = null;
      if (x < COLS) {
        const t = ((x / COLS - 0.5) * dx + (y / ROWS - 0.5) * dy) + 0.5;
        const level = Math.max(0, Math.min(2.999, t * 3 + (random() - 0.5) * 0.7));
        color = shades[Math.floor(level)];
      }
      if (color !== runColor) {
        if (runColor) parts.push(rect(runStart, y, x - runStart, 1, runColor));
        runStart = x;
        runColor = color;
      }
    }
  }
  // 前景：3 到 5 块浅色砖。
  const count = 3 + Math.floor(random() * 3);
  for (let i = 0; i < count; i += 1) {
    const w = 4 + Math.floor(random() * 8);
    const h = 2 + Math.floor(random() * 3);
    const x = 1 + Math.floor(random() * (COLS - w - 2));
    const y = 1 + Math.floor(random() * (ROWS - h - 2));
    const face = RAMP[3 + Math.floor(random() * 3)];
    parts.push(brick(x, y, w, h, face, RAMP[0]));
  }
  // 点缀：几个单格亮点。
  for (let i = 0; i < 6; i += 1) {
    parts.push(rect(Math.floor(random() * COLS), Math.floor(random() * ROWS), 1, 1, RAMP[4]));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COLS * CELL} ${ROWS * CELL}" width="${COLS * CELL * 2}" height="${ROWS * CELL * 2}" shape-rendering="crispEdges">${parts.join('')}</svg>`;
}
