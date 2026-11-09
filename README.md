<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai> -->

# 学堂在线

学堂在线是一个在本机运行的视频课程网站，用作《给人类开发者的 AI 原生软件工程课》的实战项目。
它已经提供账号登录、课程目录、课程管理和限时播放；学员在课上用规约和工作流为它增加新功能，例如“报名后才能观看”。

## 运行

需要 [Node.js 24](https://nodejs.org/zh-cn/download)（版本见 `.nvmrc`）。无需 `npm install`，也不需要联网。

```sh
npm start
```

打开 <http://localhost:3000>，按 `Ctrl+C` 停止。首次启动会自动建库并写入示例账号和课程，以后启动保留已有数据。

## 示例账号

| 账号 | 密码 | 身份 |
| --- | --- | --- |
| `admin` | `123456` | 管理员 |
| `student` | `123456` | 学员 |
| `student2` | `123456` | 学员 |

## 测试

```sh
npm test
```

## 课程起点

| 标签 | 内容 |
| --- | --- |
| `start` | 可运行的学堂，没有 `specs/`，第一天从初始化规约开始 |
| `specs-ready` | 与 `start` 代码相同，另含观看功能的基座规约 |
