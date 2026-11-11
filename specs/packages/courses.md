<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com> -->

# courses: 课程公开浏览与管理

## 意图

本包保留课程目录、详情和管理员课程维护能力，并对外提供当前发布状态。
报名和观看资格不由本包决定。

## 外部行为

### courses-1

当访问课程接口，服务应执行请求边界 [[web-contract-1](web-contract.md#web-contract-1)]、JSON 对象读取 [[web-contract-2](web-contract.md#web-contract-2)]和中文错误输出 [[web-contract-3](web-contract.md#web-contract-3)]，页面文字应安全输出 [[web-contract-4](web-contract.md#web-contract-4)]。

### courses-2

当请求 `/`、`/courses/:id`、`GET /api/courses` 或 `GET /api/courses/:id`，课程服务应无需登录或报名即可提供已发布课程：

- 目录按课程 id 升序排列，接口返回 `{courses:[...]}`，详情返回 `{course}`。
- 公开字段为 id、title、summary、description、instructor、level、levelLabel、durationSeconds、published、url、coverUrl、updatedAt。
- level 为 beginner、intermediate、advanced，对应入门、进阶、高级，published 为布尔值。
- 公开数据不包含 videoFile、播放授权或其他学员报名信息。
- 目录显示课程标题、简介、讲师、难度、时长和封面，详情另显示介绍与更新时间，空目录显示暂无已发布课程。

### courses-3

当查询课程的公开可用性，课程服务应仅将当前已发布且编号有效的课程判为可用，未发布、不存在或不合法编号均不可用，公开详情返回 404：

- 编号为不带前导零的正十进制安全整数，长度最多 16 位。
- 管理员身份不使草稿公开详情变为可用。

### courses-4

当访问课程管理页面或接口，课程服务应根据当前会话身份 [[identity-3](identity.md#identity-3)]限制为管理员：

- `/admin`、`/admin/courses/new`、`/admin/courses/:id/edit` 对游客 302 到带 next 的登录页，对学员返回 403。
- `/api/admin/courses`、`/api/admin/courses/:id`、`/api/admin/videos` 对游客返回 401，对学员返回 403。
- 拒绝操作不改变课程。

### courses-5

当管理员查询课程管理资源，课程服务应提供全部课程及可选视频：

- `GET /api/admin/courses` 返回按 id 升序的 `{courses}`，含草稿。
- `GET /api/admin/courses/:id` 返回 `{course}`，课程字段在公开字段 [[courses-2](#courses-2)]基础上增加 videoFile、createdAt，不存在或编号无效返回 404。
- `GET /api/admin/videos` 返回按文件名排序的 `{videos}`，每项包含 file、sizeBytes、durationSeconds，时长无法读取时为 null。
- 可选视频仅来自本地 media 目录内符合小写字母、数字及连字符命名规则的 MP4 文件。

### courses-6

当管理员创建或修改课程，课程服务应保留已有写入契约：

- `POST /api/admin/courses` 创建成功返回 201 和 `{course}`，未提供 published 时为草稿。
- `PATCH /api/admin/courses/:id` 只修改提交字段，成功返回 200 和 `{course}`，未提交字段保留。
- 可写字段为 title、summary、description、instructor、level、videoFile、published，未知字段或空修改返回 400。
- title、summary、instructor 为必填非空文字，上限分别为 80、200、40 个字符；description 选填，上限 5000 个字符；文字去除首尾空白并统一换行。
- level 仅接受 beginner、intermediate、advanced，videoFile 必须来自可选本地视频 [[courses-5](#courses-5)]，published 必须为布尔值。
- 字段错误返回 400 与 fields，失败不部分更新；视频时长从选择的视频读取，无法读取时为 0。

### courses-7

当管理员改变课程发布状态，课程服务应立即以新的 published 值判定后续公开查询的可用性，更新课程更新时间，并保留课程内容与编号。

### courses-8

当请求 `/covers/:id.svg`，封面服务应对有效编号生成稳定的 SVG 封面并允许公开缓存 3600 秒，不要求课程已发布或存在，非法编号返回 404。

## 验证

### courses-9

给定真实课程页面与接口，当集成测试发送非法请求并渲染含 HTML 特殊字符的课程，测试应断言错误形式与安全输出正确 [[courses-1](#courses-1)]。

### courses-10

给定已发布与草稿课程，当集成测试分别以游客、管理员、已报名和未报名学员查询目录及详情，测试应断言公开课程集合、排序、字段和页面信息一致且不暴露视频文件或报名隐私 [[courses-2](#courses-2)]。

### courses-11

给定已发布课程和草稿，当集成测试查询草稿、不存在编号、abc、0、01 和过大编号，测试应断言公开接口和页面均返回 404，并确认管理员也不能经公开入口读取草稿 [[courses-3](#courses-3)]。

### courses-12

给定游客、学员和管理员客户端，当集成测试访问全部管理入口，测试应断言只有管理员可操作，游客跳转或 401、学员 403 且数据不受越权请求影响 [[courses-4](#courses-4)]。

### courses-13

给定真实管理员和本地示例媒体，当集成测试查询管理列表、单课和视频列表，测试应断言草稿可见、字段与排序正确、非法编号返回 404 且视频文件名、大小和时长可用 [[courses-5](#courses-5)]。

### courses-14

给定管理员和真实课程接口，当集成测试创建默认草稿、部分修改以及提交超长、空值、错误类型、未知字段和非法视频，测试应断言成功结果、默认值、保留字段及失败时不改变数据 [[courses-6](#courses-6)]。

### courses-15

给定管理员创建的草稿，当集成测试发布、取消发布和重新发布后查询公开目录及详情，测试应断言可见性随状态变化且课程编号和内容保持 [[courses-7](#courses-7)]。

### courses-16

给定真实封面入口，当集成测试重复请求同一编号并请求不同编号、草稿编号及非法编号，测试应断言输出稳定、不同编号封面不同、缓存头正确且非法编号返回 404 [[courses-8](#courses-8)]。
