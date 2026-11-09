// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { randomBytes } from 'node:crypto';
import { getSetting, setSetting, transaction } from './db.js';
import { hashPassword } from './auth.js';

export const DEMO_PASSWORD = '123456';

export const demoAccounts = [
  { username: 'admin', displayName: '王教务', role: 'admin' },
  { username: 'student', displayName: '李小明', role: 'student' },
  { username: 'student2', displayName: '陈小红', role: 'student' },
];

export const demoCourses = [
  {
    title: 'Python 入门：写出第一个程序',
    summary: '从变量、条件和循环开始，用一个猜数字小游戏把基础语法串起来。',
    description: '这门课面向从没写过代码的同学。我们先装好 Python，再一步步写出一个能和你对话的猜数字游戏。\n\n每一节都先演示、再动手：你会认识变量与类型、if 判断、while 循环和函数，并学会读懂报错信息。\n\n学完后，你能独立写出几十行的小程序，并知道下一步该学什么。',
    instructor: '林知远',
    level: 'beginner',
    durationSeconds: 18,
    videoFile: 'python-basics.mp4',
    published: true,
  },
  {
    title: '用 Git 管好每一次修改',
    summary: '提交、分支与合并：在团队里放心地改代码，出错也能找回来。',
    description: '把 Git 当成代码的“时光机”。课程从第一次提交讲起，覆盖查看历史、撤销修改、创建分支和合并冲突。\n\n我们用一个多人协作的小项目演示常见场景：两个人改了同一行怎么办？提交写错了怎么补救？\n\n课程最后整理一份团队提交约定，可以直接用到你的项目里。',
    instructor: '周若溪',
    level: 'beginner',
    durationSeconds: 20,
    videoFile: 'git-essentials.mp4',
    published: true,
  },
  {
    title: 'Web 接口设计与测试',
    summary: '用 HTTP 工具直接调用接口，读懂状态码，写出可重复执行的接口测试。',
    description: '页面背后是一组 HTTP 接口。本课教你用 curl 和浏览器开发者工具观察请求与响应，理解方法、路径、状态码和 JSON 结构。\n\n接着我们设计一组课程接口：哪些需要登录、出错时返回什么、怎样避免越权访问。\n\n最后把这些约定写成自动化测试，每次修改后一条命令就能确认接口仍然正确。',
    instructor: '陈墨',
    level: 'intermediate',
    durationSeconds: 22,
    videoFile: 'web-api-testing.mp4',
    published: true,
  },
  {
    title: 'SQLite 数据建模实践',
    summary: '从需求出发设计表结构，用迁移脚本安全地演进数据库。',
    description: '这门课还在准备中，供管理员练习发布流程。\n\n内容涵盖表与字段设计、约束与索引、编写迁移脚本，以及迁移前后如何备份与核对数据。',
    instructor: '许清',
    level: 'intermediate',
    durationSeconds: 16,
    videoFile: 'sqlite-modeling.mp4',
    published: false,
  },
];

/** 首次启动写入签名密钥、示例账号和课程；已写入过则什么都不做。 */
export function seedIfNeeded(db, now = Date.now()) {
  if (getSetting(db, 'seeded_at')) return false;
  transaction(db, () => {
    setSetting(db, 'playback_secret', randomBytes(32).toString('hex'));
    const insertUser = db.prepare(`INSERT INTO users (username, display_name, role, password_hash, password_salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`);
    for (const account of demoAccounts) {
      const { hash, salt } = hashPassword(DEMO_PASSWORD);
      insertUser.run(account.username, account.displayName, account.role, hash, salt, now);
    }
    const insertCourse = db.prepare(`INSERT INTO courses
      (title, summary, description, instructor, level, duration_seconds, video_file, published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const course of demoCourses) {
      insertCourse.run(course.title, course.summary, course.description, course.instructor, course.level,
        course.durationSeconds, course.videoFile, course.published ? 1 : 0, now, now);
    }
    setSetting(db, 'seeded_at', now);
  });
  return true;
}
