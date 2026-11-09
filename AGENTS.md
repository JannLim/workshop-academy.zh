<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai> -->

# 项目约定

- 文件名、目录名、标识符、数据库表和字段、JSON 字段、URL 路径用英文；页面文字、提示、错误消息、脚本输出和文档用简体中文。
- 只依赖 Node.js 24：不加 npm 依赖、不加构建步骤、运行时不联网，`npm start` 克隆后即可用。
- 每个源文件开头保留 SPDX 许可与版权声明。
- 如果已有 `specs/`，先读 `specs/map.md` 和 `specs/meta.md`，按相关规约实现；改变对外承诺前先修订规约。
- 视频只能通过播放授权读取：页面和直调接口都经过 `src/playback.js` 中同一个观看资格检查。
- 数据库结构变更只追加新的编号迁移文件（如 `migrations/002-xxx.sql`），不修改已执行的迁移。
- `data/`、`backups/` 和数据库文件不提交。
- 变更后运行 `npm test`。
- 提交主题用 `<type>(<scope>): <中文主题>`，不超过 50 字符；正文说明做了什么、为什么。
- 智能体参与的提交最后一行加 `Co-authored-by: <实际模型> (<coder|reviewer|maintainer>) <cligent@sublang.ai>`，沿用本机 Git 身份和签名配置。
