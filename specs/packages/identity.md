<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com> -->

# identity: 身份与会话

## 意图

本包定义报名与观看依赖的当前身份，以及本轮保留的登录、退出和安全回跳行为。
账号注册与角色修改不在本轮范围内。

## 外部行为

### identity-1

当访问账号接口，服务应执行业务请求边界 [[web-contract-1](web-contract.md#web-contract-1)]、JSON 对象读取 [[web-contract-2](web-contract.md#web-contract-2)]和中文错误输出 [[web-contract-3](web-contract.md#web-contract-3)]。

### identity-2

当请求 `POST /api/login`，登录服务应校验用户名和密码并建立会话：

- 请求字段为 username、password，用户名去除首尾空白。
- 缺失或无效类型返回 400 与字段提示，错误凭据返回 401。
- 成功返回 200 和 `{user}`，user 含 id、username、displayName、role。
- 成功登录替换请求携带的旧会话，并设置 academy_session Cookie，Path=/、HttpOnly、SameSite=Lax、Max-Age=43200。

### identity-3

当解析当前请求身份，身份服务应只接受存在且未过期的 academy_session 会话，并从关联账号返回 id、username、displayName、role，缺失、伪造或过期会话视为未登录。

### identity-4

当请求 `GET /api/session`，身份服务应返回 200 和 `{user}`，已登录时使用当前身份 [[identity-3](#identity-3)]，未登录时 user 为 null。

### identity-5

当请求 `POST /api/logout`，身份服务应删除请求携带的会话并清除会话 Cookie，返回 200 和 `{ok:true}`，未登录时重复退出也成功。

### identity-6

当访问 `/login`，登录页应保留站内回跳与切换账号行为：

- next 仅接受不超过 512 字符且不含控制字符或反斜杠的站内绝对路径，不接受双斜杠开头、登录页及 `/api/` 路径，无效值回退 `/`。
- 未登录时展示登录表单，登录成功 [[identity-2](#identity-2)]后跳转到安全 next。
- 已登录时直接 302 到安全 next，switch=1 时仍展示登录表单。

## 验证

### identity-7

给定真实账号接口，当集成测试发送跨源登录请求、非法 JSON 和错误凭据，测试应断言按相应边界拒绝且不建立新会话 [[identity-1](#identity-1)]。

### identity-8

给定原有示例账号和一个已登录客户端，当集成测试依次执行错误登录、正确登录及切换账号，测试应断言失败不创建新身份、成功返回公开用户信息与 Cookie 属性、切换后旧令牌失效 [[identity-2](#identity-2)]。

### identity-9

给定真实会话和数据库，当集成测试通过服务请求分别携带有效、缺失、伪造和已到期 Cookie，测试应断言仅有效会话识别当前账号且密码与令牌散列不出现在公开用户信息中 [[identity-3](#identity-3)]。

### identity-10

给定真实服务，当集成测试在登录前后查询会话并使会话到期后再次查询，测试应断言公开用户信息与 null 随当前身份变化 [[identity-4](#identity-4)]。

### identity-11

给定已登录客户端，当集成测试退出、重用原 Cookie 并再次退出，测试应断言原令牌不再识别身份、Cookie 被清除且重复退出成功 [[identity-5](#identity-5)]。

### identity-12

给定浏览器和真实登录服务，当系统测试从课程入口登录、访问恶意 next 并使用 switch=1 切换账号，测试应断言正确回跳、无外站跳转且切换入口不会陷入权限页循环 [[identity-6](#identity-6)]。
