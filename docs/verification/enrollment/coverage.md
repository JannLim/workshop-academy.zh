<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai> -->

# 报名验收覆盖清单

当前证据：`05-ops-regression.txt`（45 项自动化测试通过）。
下列映射是覆盖审计入口；测试通过不表示已覆盖条目的全部用例，所有条目仍需逐项核对断言。
浏览器验证和禁止外网启动未执行，不能据此标记整轮验收通过。

| 验证条目 | 测试入口 | 当前结论 |
| --- | --- | --- |
| [web-contract-5](../../../specs/packages/web-contract.md#web-contract-5) | `test/server.test.js`、`test/enrollment.test.js`、`test/catalog.test.js` | 自动化回归通过；完整断言待审计 |
| [web-contract-6](../../../specs/packages/web-contract.md#web-contract-6) | `test/server.test.js`、`test/enrollment.test.js`、`test/catalog.test.js` | 自动化回归通过；完整断言待审计 |
| [web-contract-7](../../../specs/packages/web-contract.md#web-contract-7) | `test/server.test.js`、`test/enrollment.test.js`、`test/catalog.test.js` | 自动化回归通过；完整断言待审计 |
| [web-contract-8](../../../specs/packages/web-contract.md#web-contract-8) | `test/server.test.js`、`test/enrollment.test.js`、`test/catalog.test.js` | 自动化回归通过；完整断言待审计 |
| [identity-7](../../../specs/packages/identity.md#identity-7) | `test/auth.test.js` | 自动化回归通过；完整断言待审计 |
| [identity-8](../../../specs/packages/identity.md#identity-8) | `test/auth.test.js` | 自动化回归通过；完整断言待审计 |
| [identity-9](../../../specs/packages/identity.md#identity-9) | `test/auth.test.js` | 自动化回归通过；完整断言待审计 |
| [identity-10](../../../specs/packages/identity.md#identity-10) | `test/auth.test.js` | 自动化回归通过；完整断言待审计 |
| [identity-11](../../../specs/packages/identity.md#identity-11) | `test/auth.test.js` | 自动化回归通过；完整断言待审计 |
| [identity-12](../../../specs/packages/identity.md#identity-12) | `test/auth.test.js` | 未执行真实浏览器验证 |
| [courses-9](../../../specs/packages/courses.md#courses-9) | `test/catalog.test.js`、`test/admin.test.js` | 自动化回归通过；完整断言待审计 |
| [courses-10](../../../specs/packages/courses.md#courses-10) | `test/catalog.test.js`、`test/admin.test.js` | 自动化回归通过；完整断言待审计 |
| [courses-11](../../../specs/packages/courses.md#courses-11) | `test/catalog.test.js`、`test/admin.test.js` | 自动化回归通过；完整断言待审计 |
| [courses-12](../../../specs/packages/courses.md#courses-12) | `test/catalog.test.js`、`test/admin.test.js` | 自动化回归通过；完整断言待审计 |
| [courses-13](../../../specs/packages/courses.md#courses-13) | `test/catalog.test.js`、`test/admin.test.js` | 自动化回归通过；完整断言待审计 |
| [courses-14](../../../specs/packages/courses.md#courses-14) | `test/catalog.test.js`、`test/admin.test.js` | 自动化回归通过；完整断言待审计 |
| [courses-15](../../../specs/packages/courses.md#courses-15) | `test/catalog.test.js`、`test/admin.test.js` | 自动化回归通过；完整断言待审计 |
| [courses-16](../../../specs/packages/courses.md#courses-16) | `test/catalog.test.js`、`test/admin.test.js` | 自动化回归通过；完整断言待审计 |
| [enrollment-8](../../../specs/packages/enrollment.md#enrollment-8) | `test/enrollment.test.js`、`test/ops.test.js` | 自动化回归通过；完整断言待审计 |
| [enrollment-9](../../../specs/packages/enrollment.md#enrollment-9) | `test/enrollment.test.js`、`test/ops.test.js` | 自动化回归通过；完整断言待审计 |
| [enrollment-10](../../../specs/packages/enrollment.md#enrollment-10) | `test/enrollment.test.js`、`test/ops.test.js` | 自动化回归通过；完整断言待审计 |
| [enrollment-11](../../../specs/packages/enrollment.md#enrollment-11) | `test/enrollment.test.js`、`test/ops.test.js` | 自动化回归通过；完整断言待审计 |
| [enrollment-12](../../../specs/packages/enrollment.md#enrollment-12) | `test/enrollment.test.js`、`test/ops.test.js` | 自动化回归通过；完整断言待审计 |
| [enrollment-13](../../../specs/packages/enrollment.md#enrollment-13) | `test/enrollment.test.js`、`test/ops.test.js` | 自动化回归通过；完整断言待审计 |
| [enrollment-14](../../../specs/packages/enrollment.md#enrollment-14) | `test/enrollment.test.js`、`test/ops.test.js` | 自动化回归通过；完整断言待审计 |
| [playback-6](../../../specs/packages/playback.md#playback-6) | `test/watch.test.js` | 自动化回归通过；完整断言待审计 |
| [playback-7](../../../specs/packages/playback.md#playback-7) | `test/watch.test.js` | 自动化回归通过；完整断言待审计 |
| [playback-8](../../../specs/packages/playback.md#playback-8) | `test/watch.test.js` | 自动化回归通过；完整断言待审计 |
| [playback-9](../../../specs/packages/playback.md#playback-9) | `test/watch.test.js` | 自动化回归通过；完整断言待审计 |
| [playback-10](../../../specs/packages/playback.md#playback-10) | `test/watch.test.js` | 自动化回归通过；完整断言待审计 |
| [learning-ui-9](../../../specs/packages/learning-ui.md#learning-ui-9) | `test/enrollment-page.test.js` | 未执行真实浏览器验证 |
| [learning-ui-10](../../../specs/packages/learning-ui.md#learning-ui-10) | `test/enrollment-page.test.js` | 未执行真实浏览器验证 |
| [learning-ui-11](../../../specs/packages/learning-ui.md#learning-ui-11) | `test/enrollment-page.test.js` | 未执行真实浏览器验证 |
| [learning-ui-12](../../../specs/packages/learning-ui.md#learning-ui-12) | `test/enrollment-page.test.js` | 未执行真实浏览器验证 |
| [learning-ui-13](../../../specs/packages/learning-ui.md#learning-ui-13) | `test/enrollment-page.test.js` | 未执行真实浏览器验证 |
| [learning-ui-14](../../../specs/packages/learning-ui.md#learning-ui-14) | `test/enrollment-page.test.js` | 未执行真实浏览器验证 |
| [learning-ui-15](../../../specs/packages/learning-ui.md#learning-ui-15) | `test/enrollment-page.test.js` | 未执行真实浏览器验证 |
| [learning-ui-16](../../../specs/packages/learning-ui.md#learning-ui-16) | `test/enrollment-page.test.js` | 未执行真实浏览器验证 |
| [continuity-7](../../../specs/packages/continuity.md#continuity-7) | `test/db.test.js`、`test/ops.test.js`、`test/repo.test.js` | 自动化回归通过；完整断言待审计 |
| [continuity-8](../../../specs/packages/continuity.md#continuity-8) | `test/db.test.js`、`test/ops.test.js`、`test/repo.test.js` | 自动化回归通过；完整断言待审计 |
| [continuity-9](../../../specs/packages/continuity.md#continuity-9) | `test/db.test.js`、`test/ops.test.js`、`test/repo.test.js` | 自动化回归通过；完整断言待审计 |
| [continuity-10](../../../specs/packages/continuity.md#continuity-10) | `test/db.test.js`、`test/ops.test.js`、`test/repo.test.js` | 自动化回归通过；完整断言待审计 |
| [continuity-11](../../../specs/packages/continuity.md#continuity-11) | `test/db.test.js`、`test/ops.test.js`、`test/repo.test.js` | 自动化回归通过；完整断言待审计 |
| [continuity-12](../../../specs/packages/continuity.md#continuity-12) | `test/db.test.js`、`test/ops.test.js`、`test/repo.test.js` | 离线启动未执行；仅静态运行约束检查通过 |

## 测试名称索引

### test/server.test.js

- 页面返回带站点外壳的中文 HTML 和安全响应头
- 静态资源可协商缓存，不提供目录外或隐藏文件
- 页面路由出错返回 HTML 错误页，接口出错返回中文 JSON
- 非 GET 接口要求 JSON 与同源请求，并拒绝陌生 Host
- 健康检查报告迁移状态
- 运行记录只允许一个实例使用同一数据目录，失效记录自动清理
- 数据库有待执行的迁移时拒绝启动并保持数据不变
- 维护令牌可以请求正常停服，错误令牌被拒绝

### test/enrollment.test.js

- 报名接口按本人身份隔离，拒绝游客管理员及伪造归属
- 报名无名额限制且重复并发幂等，取消再报与下架列表
- 报名请求保留 JSON 同源校验，失败写入不报告成功

### test/catalog.test.js

- 目录与详情只公开已发布课程
- 目录页与详情页渲染课程信息，草稿返回 HTML 404 页面
- 页面内容经过转义
- 封面按课程编号确定生成像素 SVG

### test/auth.test.js

- 示例账号登录后取得 HttpOnly 会话，退出后会话失效
- 已登录时换账号登录，新会话替换旧会话
- 数据库只保存会话令牌的散列，过期会话无效
- 登录页提供示例账号；已登录时按安全的 next 跳转
- 请求体过大或不是 JSON 对象时拒绝

### test/admin.test.js

- 管理页面：未登录跳转登录，学员看到 403 页面
- 管理接口只对管理员开放
- 管理员创建草稿、修改并发布课程，目录随之变化
- 课程字段校验返回逐字段的中文提示

### test/ops.test.js

- 备份会先请运行中的服务正常停止，再复制数据库
- 恢复要求服务已停止，校验快照并保留恢复前的数据库
- 新增迁移后：启动被拒绝，备份并迁移后保留原数据启动
- 同一数据目录不能启动第二个服务
- 报名升级演练保留旧库全部业务字段、修改后的凭据与自建课程
- 报名与取消经退出重登、账号切换和进程重启保持归属，失败写入整体回滚
- 报名快照恢复有效与已取消状态，后续变化仅存在于恢复前副本

### test/watch.test.js

- 示例视频齐全，时长与种子课程一致，体积小
- 取得播放地址需要登录且课程已发布
- 课程页按同一资格检查显示观看状态
- 签名地址支持范围请求，篡改的地址被拒绝
- 播放地址到期后返回 410，重新申请即可继续
- 课程的视频文件缺失时返回 404
- 观看矩阵统一检查身份报名和发布状态，旧地址立即失去资格

### test/enrollment-page.test.js

- 报名页面按身份和状态显示操作，列表保留下架报名

### test/db.test.js

- 新数据库执行全部迁移并写入示例数据，重复执行不改变数据
- 迁移状态列出待执行文件，执行失败的文件整体回滚
- 已执行的迁移被修改、删除或新文件排在前面时拒绝迁移
- 报名迁移保留旧账号课程且不自动报名

### test/repo.test.js

- 每个源文件都带 SPDX 许可与版权声明
- 固定 Node.js 24 且没有 npm 依赖

## 浏览器执行步骤（待执行）

使用临时 DATA_DIR 启动真实服务，记录浏览器版本、截图、请求状态和每步结果，不保存 Cookie、密码或可用播放地址。

1. learning-ui-9：分别以游客、管理员、未报名、已取消和已报名学员浏览目录与详情，核对公开介绍、按钮和初始页面无授权。
2. learning-ui-10：游客从详情登录，核对返回原课程、尚未报名；主动点击后才创建报名。
3. learning-ui-11：成功报名后观看；另在提交前下架课程或使会话到期，核对失败提示和服务端状态。
4. learning-ui-12：两个学员报名不同课程，核对本人列表、游客回跳、管理员 403、下架无详情入口及空集合。
5. learning-ui-13：取消前核对失去观看资格的确认提示；成功移除项目，断网取消失败时保留项目且可重试。
6. learning-ui-14：点击观看，开发者工具核对先申请授权再携会话读取媒体；阻止自动播放后核对手动播放提示。
7. learning-ui-15：用短期真实授权并禁用缓存，授权过期后触发新的 Range 请求；核对恢复进度与暂停意图，再取消报名、使会话到期及连续失败，核对拒绝、登录回跳与两次恢复上限。
8. learning-ui-16：重复点击并观察请求期间按钮禁用；失败可重试，特殊字符按文字显示，提示具有 status 或 alert 语义。
9. identity-12：从课程登录、使用恶意 next 和 switch=1 切换账号，核对回跳安全且无循环。
