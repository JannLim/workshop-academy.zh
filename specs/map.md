<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai> -->
<!-- spex-i18n-source: map.md sha256-5dbf6d5bf1f09c74f8bf71209986eca460723957c6861f0a73654b88d9e522d9 -->

# 规约地图

用于快速定位决策和规约包的索引。
规约条目是事实来源。
开发过程中，代码可能与规约暂时不一致。

## 编写和审阅规约

在编写、修改或审阅 DR、IR 或条目前，先了解 [`meta.md`](meta.md) 中的规则。

## 目录结构

```text
decisions/    决策记录（DRs）
intents/      意图记录（IRs）
packages/     规约包（每包一个文件）
map.md        本索引
meta.md       规约的规约
```

## 决策

| ID | 文件 | 摘要 |
| --- | --- | --- |
| [DR-000](decisions/000-spec-structure-format.md) | 000-spec-structure-format.md | 规约结构、格式和命名约定 |
| [DR-001](decisions/001-self-service-enrollment.md) | 001-self-service-enrollment.md | 学员自助报名、取消与个人报名管理（已接受） |
| [DR-002](decisions/002-enrollment-watch-eligibility.md) | 002-enrollment-watch-eligibility.md | 有效报名约束观看及资格失效边界（已接受） |
| [DR-003](decisions/003-enrollment-data-continuity.md) | 003-enrollment-data-continuity.md | 报名持久化与既有账号、课程延续（已接受） |

## 规约包

| 文件 | 摘要 |
| --- | --- |
| [git.md](packages/git.md) | 提交信息格式和 AI 共同作者 trailers |
| [licensing.md](packages/licensing.md) | SPDX 头要求与验证检查 |
| [web-contract.md](packages/web-contract.md) | 业务 HTTP 边界、JSON 和中文错误 |
| [identity.md](packages/identity.md) | 登录会话与安全回跳 |
| [courses.md](packages/courses.md) | 公开课程、发布状态与管理员维护 |
| [enrollment.md](packages/enrollment.md) | 本人报名、取消、列表与有效性 |
| [playback.md](packages/playback.md) | 统一资格、限时授权与视频读取 |
| [learning-ui.md](packages/learning-ui.md) | 报名、个人列表与观看页面闭环 |
| [continuity.md](packages/continuity.md) | 持久化、增量迁移及备份恢复 |

## 本轮业务依赖

下表列出使用方依赖的提供方，具体绑定以各行为条目的行内引用为准。
验证条目仅引用本包行为，并通过真实服务执行其依赖。

| 使用方 | 提供方及用途 |
| --- | --- |
| identity | web-contract：请求与错误契约 |
| courses | web-contract：请求与呈现；identity：管理员身份 |
| enrollment | web-contract：请求；identity：本人身份；courses：可报名课程；continuity：成功提交 |
| playback | web-contract：请求与错误；identity：当前身份；courses：公开可用性；enrollment：有效报名 |
| learning-ui | web-contract：安全提示；identity：登录回跳；courses：公开信息；enrollment：自助操作；playback：资格与播放 |
| continuity | enrollment：重启、重登后的有效性与本人列表延续 |

报名依赖持久化成功保证，数据延续依赖报名的业务解释，两者为显式契约依赖，不要求实现互相调用。
本轮保留公开浏览、登录会话、课程管理、签名时限、范围读取和运维流程；观看资格及媒体读取授权按已接受 DR 收紧。
本轮只定义目标规约，现有测试中“登录即可观看”和“无 Cookie 读取签名地址成功”的断言需在实现阶段更新。
