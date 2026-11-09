// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

export const LEVEL_LABELS = { beginner: '入门', intermediate: '进阶', advanced: '高级' };

/** 18 → “18 秒”，200 → “3 分 20 秒”，3900 → “1 小时 5 分”。 */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) return `${hours} 小时${minutes ? ` ${minutes} 分` : ''}`;
  if (minutes) return `${minutes} 分${secs ? ` ${secs} 秒` : ''}`;
  return `${secs} 秒`;
}

/** 视频角标：0:18、12:05、1:02:03。 */
export function formatClock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function formatDate(ms) {
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateTime(ms) {
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${formatDate(ms)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function courseCode(id) {
  return `课程 ${String(id).padStart(2, '0')}`;
}

/** 课程介绍按空行分段。 */
export function paragraphs(text) {
  return String(text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
