-- SPDX-License-Identifier: Apache-2.0
-- SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com>

-- 只存当前有效报名；取消删除本人关联，重新报名重新创建。
CREATE TABLE enrollments (
  user_id INTEGER NOT NULL REFERENCES users (id),
  course_id INTEGER NOT NULL REFERENCES courses (id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, course_id)
);
