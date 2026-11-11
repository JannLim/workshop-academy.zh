<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com> -->

# web-contract: 业务 HTTP 公共契约

## 意图

本包定义账号、课程、报名和播放共用的请求边界与响应形式，保留本轮不改变的 HTTP 行为。
本包不定义各业务的权限和状态转换。

## 外部行为

### web-contract-1

当收到业务 HTTP 请求，服务应在路由处理前检查访问来源：

- Host 仅接受 localhost、127.0.0.1 或 [::1]，其他值返回 400。
- 非 GET、HEAD 请求携带 Origin 时，必须等于当前请求的 http 同源地址，否则返回 403。
- 非 GET、HEAD 的 `/api/` 请求必须声明 `Content-Type: application/json`，否则返回 415。

### web-contract-2

当业务接口读取 JSON 请求体，服务应接受不超过 64 KiB 的 JSON 对象：

- 空请求体视为 `{}`。
- JSON 语法错误、数组、null 或其他非对象值返回 400。
- 声明或实际读取的请求体超过限制时返回 413。

### web-contract-3

当业务请求失败，服务应返回与入口相符的中文错误响应：

- `/api/`、`/media/` 和 `/internal/` 返回 JSON `{error}`，字段校验错误可附加 `fields`。
- 页面返回带站点外壳的 HTML 错误页。
- 未知路由返回 404，已知路径不支持的方法返回 405 并附带 Allow。
- 非预期内部错误返回 500 和“服务暂时不可用，请稍后重试”，不暴露内部错误内容。

### web-contract-4

当业务响应包含用户或课程文字，服务应以安全方式输出文字并保留既有响应保护：

- HTML 文本和属性转义不可信内容，客户端提示按文本显示。
- 业务响应默认 `Cache-Control: no-store`。
- 保留 nosniff、no-referrer、DENY、same-origin 隔离及仅允许本站脚本、样式、媒体与连接的内容安全策略。

## 验证

### web-contract-5

给定真实服务，当集成测试组合合法与非法 Host、同源与跨源 Origin、缺失与正确 JSON 类型请求头，测试应断言只有满足边界的请求进入业务处理，拒绝请求不改变业务状态 [[web-contract-1](#web-contract-1)]。

### web-contract-6

给定真实 JSON 接口，当集成测试提交空对象、空请求体、非法 JSON、非对象值和超限请求体，测试应断言接受与拒绝结果符合请求体约定 [[web-contract-2](#web-contract-2)]。

### web-contract-7

给定真实服务，当集成测试触发页面、接口、媒体错误、未知路由、不支持的方法及隔离环境中的内部异常，测试应断言响应类型、状态、中文消息和 Allow 符合错误契约 [[web-contract-3](#web-contract-3)]。

### web-contract-8

给定真实页面与接口，当集成测试写入包含脚本和属性注入片段的课程文字并请求页面，测试应断言片段作为文字输出且业务响应包含规定的缓存与安全响应头 [[web-contract-4](#web-contract-4)]。
