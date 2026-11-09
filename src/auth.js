// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 200;

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { hash: scryptSync(password, salt, KEY_LENGTH).toString('hex'), salt };
}

// 用户不存在时也计算一次散列，避免靠响应时间猜出账号是否存在。
const dummy = hashPassword('not-a-real-password');

export function verifyPassword(user, password) {
  if (typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) return false;
  const expected = Buffer.from(user ? user.password_hash : dummy.hash, 'hex');
  const actual = scryptSync(password, user ? user.password_salt : dummy.salt, KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual) && Boolean(user);
}

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, displayName: user.display_name, role: user.role };
}
