-- SPDX-License-Identifier: Apache-2.0
-- SPDX-FileCopyrightText: 2026 liyan <1982119376@qq.com>

-- 报名：账号与课程的一对一关系，同一账号对同一课程至多一条记录。

CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, course_id)
);

CREATE INDEX enrollments_user_created ON enrollments (user_id, created_at);