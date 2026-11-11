<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com> -->

# IR-001: 自助报名与观看资格实施

## 状态

待审阅（2026-11-11）。
仅编写实施计划，尚未获得本 IR 的实施确认，未开始功能实现或迁移当前使用中的数据库。
用户确认后开始实施；未执行、失败或证据不足的交付项均保持未完成。

## 意图

实施已接受的 [DR-001](../decisions/001-self-service-enrollment.md)、[DR-002](../decisions/002-enrollment-watch-eligibility.md) 和 [DR-003](../decisions/003-enrollment-data-continuity.md)，完成公开浏览、本人报名管理、资格约束观看与持久化闭环。
行为事实来源为报名、播放、学习页面、数据延续、身份、课程及 HTTP 公共契约七个规约包，本记录仅安排实施与验证，不新增业务规则。

- 沿用 `src/auth.js` 的会话身份、`src/courses.js` 的课程管理和发布状态、`src/playback.js` 的统一资格入口及 `src/db.js` 的增量迁移机制。
- 复用 `test/helpers.js` 的真实服务、临时数据库和 Cookie 客户端，新增接口测试不以模拟身份或模拟数据库代替真实链路。
- 现有观看测试及 `test/admin.test.js`、`test/ops.test.js` 中“登录即可观看”的用例需要补充真实报名步骤；公开浏览、登录、管理员维护与视频格式相关断言保留。
- 新接口命名、响应字段和存储结构在实施时具体化，长期保留的信息写入相应接口文档或规约包，不只留在本 IR。
- 对业务逻辑歧义、规约冲突或已确认范围以外的对外行为变更，先列出问题、影响和建议并取得用户确认，再修订规约和实现。
- 不增加 npm 依赖、构建步骤或运行时联网要求；测试工具不得成为项目运行依赖。
- 数据升级和恢复在隔离副本中演练，本计划不包含对当前使用中的 `data/` 执行迁移、恢复或删库操作。

## 交付项

- [ ] 新增编号迁移及报名持久化访问能力，满足 [[continuity-1](../packages/continuity.md#continuity-1)]、[[continuity-2](../packages/continuity.md#continuity-2)]、[[continuity-3](../packages/continuity.md#continuity-3)]，不修改 `001-init.sql`。
- [ ] 报名、取消、重新报名、个人列表与有效性判断，以及权限隔离和重复并发提交测试，覆盖 [[enrollment-8](../packages/enrollment.md#enrollment-8)]、[[enrollment-9](../packages/enrollment.md#enrollment-9)]、[[enrollment-10](../packages/enrollment.md#enrollment-10)]、[[enrollment-11](../packages/enrollment.md#enrollment-11)]、[[enrollment-12](../packages/enrollment.md#enrollment-12)]、[[enrollment-13](../packages/enrollment.md#enrollment-13)]、[[enrollment-14](../packages/enrollment.md#enrollment-14)]。
- [ ] 页面状态、授权申请和 GET、Range、HEAD 读取接入同一个观看检查，完成 [[playback-6](../packages/playback.md#playback-6)]、[[playback-7](../packages/playback.md#playback-7)]、[[playback-8](../packages/playback.md#playback-8)]、[[playback-9](../packages/playback.md#playback-9)]、[[playback-10](../packages/playback.md#playback-10)] 的验证。
- [ ] 详情报名入口、导航、我的报名、取消提示和播放器恢复交互，以及学习页面包全部系统验证，覆盖 [[learning-ui-9](../packages/learning-ui.md#learning-ui-9)]、[[learning-ui-10](../packages/learning-ui.md#learning-ui-10)]、[[learning-ui-11](../packages/learning-ui.md#learning-ui-11)]、[[learning-ui-12](../packages/learning-ui.md#learning-ui-12)]、[[learning-ui-13](../packages/learning-ui.md#learning-ui-13)]、[[learning-ui-14](../packages/learning-ui.md#learning-ui-14)]、[[learning-ui-15](../packages/learning-ui.md#learning-ui-15)]、[[learning-ui-16](../packages/learning-ui.md#learning-ui-16)]。
- [ ] 旧库升级、成功与失败写入、重启重登、备份恢复及运行约束的系统验证，覆盖 [[continuity-7](../packages/continuity.md#continuity-7)]、[[continuity-8](../packages/continuity.md#continuity-8)]、[[continuity-9](../packages/continuity.md#continuity-9)]、[[continuity-10](../packages/continuity.md#continuity-10)]、[[continuity-11](../packages/continuity.md#continuity-11)]、[[continuity-12](../packages/continuity.md#continuity-12)]。
- [ ] 七个业务包的 44 个验证条目均建立“条目 → 测试名称或系统步骤 → 执行证据 → 结果”映射，保留并补齐身份、课程与 HTTP 契约回归。
- [ ] 更新 `docs/api.md`、`docs/operations.md` 和必要的 README 说明，提供可复现的报名、观看与升级操作示例，清除旧授权语义。
- [ ] 最终 `spex lint`、`npm test`、浏览器系统验证、数据演练和变更检查通过，保存失败、修复及复测证据，并按实际结果更新本记录。

## 任务

以下每项工作量对应一次提交，包含该项实现、相关测试及必要文档更新。
任务按编号依次进行；任务 4 和 5 都以任务 3 为基础，任务 6 汇总前序结果，任务 7 只记录实际已完成的结果。
提交前运行 `npm test`；测试驱动修改先执行能暴露目标缺口的测试，再实现并复测，不提交明知失败的中间状态。
提交主题使用中文，正文说明修改内容及原因并引用 IR-001，沿用本机 Git 身份与签名配置，按实际模型添加共同作者尾注。

1. **报名存储与增量迁移**（建议主题：`feat(enrollment): 增加报名持久化基础`）。
   - 在确认迁移目录当前编号后追加新迁移，预计为 `migrations/002-enrollments.sql`，实现账号与课程关联、有效性及唯一性所需存储约束。
   - 增加报名存储操作，保持写入原子性，避免成功返回早于提交。
   - 扩充 `test/db.test.js`，使用旧结构副本和新数据库验证迁移、原数据保持、唯一性及写入失败回滚。
   - 本提交不修改种子账号、课程或既有迁移，不自动补报名。

2. **自助报名服务与接口**（建议主题：`feat(enrollment): 增加本人报名管理接口`）。
   - 增加报名业务模块并在 `src/app.js` 注册接口，复用会话、课程可用性、JSON 读取和错误响应机制。
   - 实现报名、重复并发提交、取消、重新报名、有效性及本人列表，将身份归属固定为当前登录账号。
   - 在 `docs/api.md` 记录最终接口路径、方法、输入、输出及错误，新增 `test/enrollment.test.js` 和所需测试辅助方法。
   - 逐项执行报名包验证，特别检查管理员拒绝、伪造用户标识、草稿报名、下架课程取消与列表隐私。

3. **统一观看资格与媒体检查**（建议主题：`feat(playback): 按有效报名校验视频读取`）。
   - 修改 `src/playback.js` 中统一观看检查，并将签发及媒体读取接入同一检查，遵守现有规约中的错误优先级。
   - 保留授权字段、默认时限、签名保护、范围读取和 HEAD 行为，验证旧地址不能绕过当前身份及资格。
   - 更新 `test/watch.test.js`、关联课程页断言和其他测试中的真实报名准备步骤，更新接口文档的旧授权说明。
   - 执行完整观看矩阵，记录调用链检查及实际 HTTP 状态和关键响应头。

4. **报名与观看页面闭环**（建议主题：`feat(enrollment): 增加我的报名与页面操作`）。
   - 扩展 `src/views/course.js`、`src/views/catalog.js`、`src/views/layout.js`，新增个人报名页并接入实际服务。
   - 更新 `public/js/app.js` 和必要样式，完成登录回跳、主动报名、取消提示、空列表、下架状态和错误恢复。
   - 检查播放器携带会话、自动播放被拒绝的提示、授权续期、失效资格反馈及重试上限。
   - 添加页面集成断言，并使用真实浏览器执行学习页面包的八项系统验证，不用 HTML 字符串断言代替交互验证。

5. **数据延续与运维演练**（建议主题：`test(enrollment): 覆盖升级重启与备份恢复`）。
   - 扩展 `test/ops.test.js`，以真实子进程运行维护脚本，验证旧库升级、重启重登及备份恢复后的报名状态。
   - 用修改过的旧账号与课程数据核对迁移前后字段和原凭据，禁止仅通过种子数据数量判断兼容性。
   - 在隔离数据库制造提交失败，记录失败响应与状态未部分写入的证据。
   - 更新 `docs/operations.md` 的报名数据范围和旧库升级说明，保留原维护边界。

6. **完整规约覆盖与回归修复**（建议主题：`test(enrollment): 补齐业务规约验证覆盖`）。
   - 逐条检查 44 个验证条目，将已存在的测试映射到条目，补齐身份、课程、HTTP 契约及运行约束缺口。
   - 对新增缺口执行失败测试、修复和复测，保留旧失败日志，不删除、跳过或弱化规约断言来获得通过结果。
   - 运行完整 `npm test`、全部学习页面系统步骤、升级恢复演练和 `spex lint`。
   - 环境无法执行的验证记录为未执行，失败项保持未完成；需要改变规约的发现先交用户确认。

7. **交付说明与证据归档**（建议主题：`docs(enrollment): 整理验收证据与使用说明`）。
   - 核对 README、接口文档和运维说明与最终实现一致，只有 DR 或规约包索引变化时才同步 `specs/map.md`。
   - 在 `docs/verification/enrollment/` 保存脱敏证据、覆盖矩阵和浏览器验证步骤，记录最终代码版本与工作区状态。
   - 更新本记录的任务结果、交付复选框、未完成项和修复复测链接，不将计划命令当作执行证据。
   - 检查提交范围、许可证头、依赖、迁移及运行数据未被纳入版本控制，最后执行规约检查和全量测试。

## 验证

### 执行环境与隔离

- 使用 Node.js 24，记录实际 `node --version`、`npm --version` 和 `spex --version` 输出。
- 测试服务使用临时 DATA_DIR、BACKUP_DIR 和随机端口，迁移副本只含演练所需文件，不读取或修改当前数据库中的个人数据。
- 使用真实登录和报名接口准备观看场景，使用管理员接口改变发布状态；会话到期、写入失败等难以通过公开入口制造的状态允许在隔离测试夹具中受控设置。
- 浏览器验证使用现有外部浏览器工具或人工可重复步骤，不为项目添加浏览器测试 npm 依赖。
- 验证过期恢复时使用短期真实授权并确保浏览器发出新的媒体请求；仅等待时间或读取已缓存视频不能证明恢复或拒绝生效。
- 新功能验收以实现后的新测试和系统步骤为准，当前旧测试全绿仅作为基线。

### 检查矩阵

| 检查 | 执行方式与断言重点 | 证据 |
| --- | --- | --- |
| 规约结构 | `spex lint`；检查条目、引用和 IR 格式 | 原始输出、退出码 |
| 基线及最终回归 | `npm test`；每个实现提交前和最终执行 | 测试名称、通过失败跳过数、退出码 |
| 报名集成 | `node --disable-warning=ExperimentalWarning --test test/enrollment.test.js` | 本人隔离、并发、取消再报及错误矩阵 |
| 播放集成 | `node --disable-warning=ExperimentalWarning --test test/watch.test.js` | 资格矩阵、旧地址、GET/Range/HEAD、签名和过期 |
| 数据集成与系统 | `node --disable-warning=ExperimentalWarning --test test/db.test.js test/ops.test.js` | 旧库字段对比、提交失败、重启及快照时点状态 |
| 身份、课程、HTTP 回归 | 运行 `test/auth.test.js`、`test/catalog.test.js`、`test/admin.test.js`、`test/server.test.js` 和 `test/repo.test.js` | 与对应验证条目逐一映射，不能只记录文件通过 |
| 浏览器系统验证 | 按学习页面包验证顺序操作真实服务，覆盖角色、回跳、报名、取消、下架、失败提示及播放恢复 | 浏览器版本、逐步结果、截图及脱敏请求摘要 |
| 离线与运行约束 | 在禁止外网条件下直接 `npm start`，验证独立数据目录和端口，核对 package.json 与 Git 跟踪文件 | 网络限制方式、启动输出及文件清单 |
| 变更范围 | `git diff --check`、`git status --short`、检查迁移与源码差异 | 无业务范围外改动、无旧迁移改写、无数据库及密钥提交 |

### 证据与完成规则

- 每次执行记录本地日期时间、命令或浏览器步骤、Node 及浏览器版本、提交标识、未提交差异摘要、退出码和结果。
- 证据文件采用英文名称，原始失败日志与修复后日志分开保存，覆盖矩阵链接具体文件与测试名称。
- HTTP 证据只保留必要状态、字段及断言，删除 Cookie、密码、维护令牌、可用签名地址和数据库内容等敏感信息。
- 保留修复所针对的失败、原因、改动和复测结果；代码再次改变后重跑受影响检查，最终版本再次运行全量检查。
- 只有实现、对应集成或系统验证、证据三者齐全且通过，才勾选交付项。
- 若存在未执行、未通过或无法覆盖的验证，本记录保留相应未完成项并明确原因，不标记整轮完成。
- 不在其他规约或地图中添加本 IR 的引用，保持 IR 可删除且不丢失业务决定。

### 首次审阅稿检查记录

本节保留首次 IR 草案检查结果，不代表本轮重新执行，也不代表报名功能已实施或通过验收。

| 日期 | 检查 | 结果 |
| --- | --- | --- |
| 2026-11-11 | `spex lint` | 退出码 0；no problems found |
| 2026-11-11 | IR 结构与引用检查 | 退出码 0；五个必需章节、7 项任务、8 项未勾选交付项及引用锚点有效 |
| 2026-11-11 | Node.js 24.22.2 下 `npm test` | 退出码 0；36 项通过，0 失败、0 跳过；仅验证现有基线 |
| 2026-11-11 | `git diff --check` 与工作区范围检查 | 退出码 0；本次只新增本 IR，无代码、测试或数据库变更 |

### 完整验证条目执行清单

下表列出七个业务包的全部验证条目，实施时将每条绑定到具体测试名称或浏览器步骤及证据文件。
现有测试仅作为候选覆盖位置，尚未逐条完成目标验收，不因代码基线通过而标记通过。

| 验证条目 | 实施任务 | 候选测试或步骤 | 状态 | 证据 |
| --- | --- | --- | --- | --- |
| [[web-contract-5](../packages/web-contract.md#web-contract-5)] | 2、6 | `test/server.test.js`、`test/enrollment.test.js` | 未执行 | 无 |
| [[web-contract-6](../packages/web-contract.md#web-contract-6)] | 2、6 | `test/server.test.js`、`test/enrollment.test.js` | 未执行 | 无 |
| [[web-contract-7](../packages/web-contract.md#web-contract-7)] | 2、6 | `test/server.test.js`、`test/enrollment.test.js` | 未执行 | 无 |
| [[web-contract-8](../packages/web-contract.md#web-contract-8)] | 2、6 | `test/server.test.js`、`test/enrollment.test.js` | 未执行 | 无 |
| [[identity-7](../packages/identity.md#identity-7)] | 4、6 | `test/auth.test.js`、真实浏览器登录回跳 | 未执行 | 无 |
| [[identity-8](../packages/identity.md#identity-8)] | 4、6 | `test/auth.test.js`、真实浏览器登录回跳 | 未执行 | 无 |
| [[identity-9](../packages/identity.md#identity-9)] | 4、6 | `test/auth.test.js`、真实浏览器登录回跳 | 未执行 | 无 |
| [[identity-10](../packages/identity.md#identity-10)] | 4、6 | `test/auth.test.js`、真实浏览器登录回跳 | 未执行 | 无 |
| [[identity-11](../packages/identity.md#identity-11)] | 4、6 | `test/auth.test.js`、真实浏览器登录回跳 | 未执行 | 无 |
| [[identity-12](../packages/identity.md#identity-12)] | 4、6 | `test/auth.test.js`、真实浏览器登录回跳 | 未执行 | 无 |
| [[courses-9](../packages/courses.md#courses-9)] | 3、4、6 | `test/catalog.test.js`、`test/admin.test.js` | 未执行 | 无 |
| [[courses-10](../packages/courses.md#courses-10)] | 3、4、6 | `test/catalog.test.js`、`test/admin.test.js` | 未执行 | 无 |
| [[courses-11](../packages/courses.md#courses-11)] | 3、4、6 | `test/catalog.test.js`、`test/admin.test.js` | 未执行 | 无 |
| [[courses-12](../packages/courses.md#courses-12)] | 3、4、6 | `test/catalog.test.js`、`test/admin.test.js` | 未执行 | 无 |
| [[courses-13](../packages/courses.md#courses-13)] | 3、4、6 | `test/catalog.test.js`、`test/admin.test.js` | 未执行 | 无 |
| [[courses-14](../packages/courses.md#courses-14)] | 3、4、6 | `test/catalog.test.js`、`test/admin.test.js` | 未执行 | 无 |
| [[courses-15](../packages/courses.md#courses-15)] | 3、4、6 | `test/catalog.test.js`、`test/admin.test.js` | 未执行 | 无 |
| [[courses-16](../packages/courses.md#courses-16)] | 3、4、6 | `test/catalog.test.js`、`test/admin.test.js` | 未执行 | 无 |
| [[enrollment-8](../packages/enrollment.md#enrollment-8)] | 1、2、5 | `test/enrollment.test.js`、持久化验证 | 未执行 | 无 |
| [[enrollment-9](../packages/enrollment.md#enrollment-9)] | 1、2、5 | `test/enrollment.test.js`、持久化验证 | 未执行 | 无 |
| [[enrollment-10](../packages/enrollment.md#enrollment-10)] | 1、2、5 | `test/enrollment.test.js`、持久化验证 | 未执行 | 无 |
| [[enrollment-11](../packages/enrollment.md#enrollment-11)] | 1、2、5 | `test/enrollment.test.js`、持久化验证 | 未执行 | 无 |
| [[enrollment-12](../packages/enrollment.md#enrollment-12)] | 1、2、5 | `test/enrollment.test.js`、持久化验证 | 未执行 | 无 |
| [[enrollment-13](../packages/enrollment.md#enrollment-13)] | 1、2、5 | `test/enrollment.test.js`、持久化验证 | 未执行 | 无 |
| [[enrollment-14](../packages/enrollment.md#enrollment-14)] | 1、2、5 | `test/enrollment.test.js`、持久化验证 | 未执行 | 无 |
| [[playback-6](../packages/playback.md#playback-6)] | 3、6 | `test/watch.test.js`、资格调用链检查 | 未执行 | 无 |
| [[playback-7](../packages/playback.md#playback-7)] | 3、6 | `test/watch.test.js`、资格调用链检查 | 未执行 | 无 |
| [[playback-8](../packages/playback.md#playback-8)] | 3、6 | `test/watch.test.js`、资格调用链检查 | 未执行 | 无 |
| [[playback-9](../packages/playback.md#playback-9)] | 3、6 | `test/watch.test.js`、资格调用链检查 | 未执行 | 无 |
| [[playback-10](../packages/playback.md#playback-10)] | 3、6 | `test/watch.test.js`、资格调用链检查 | 未执行 | 无 |
| [[learning-ui-9](../packages/learning-ui.md#learning-ui-9)] | 4、6 | 真实浏览器逐项系统步骤 | 未执行 | 无 |
| [[learning-ui-10](../packages/learning-ui.md#learning-ui-10)] | 4、6 | 真实浏览器逐项系统步骤 | 未执行 | 无 |
| [[learning-ui-11](../packages/learning-ui.md#learning-ui-11)] | 4、6 | 真实浏览器逐项系统步骤 | 未执行 | 无 |
| [[learning-ui-12](../packages/learning-ui.md#learning-ui-12)] | 4、6 | 真实浏览器逐项系统步骤 | 未执行 | 无 |
| [[learning-ui-13](../packages/learning-ui.md#learning-ui-13)] | 4、6 | 真实浏览器逐项系统步骤 | 未执行 | 无 |
| [[learning-ui-14](../packages/learning-ui.md#learning-ui-14)] | 4、6 | 真实浏览器逐项系统步骤 | 未执行 | 无 |
| [[learning-ui-15](../packages/learning-ui.md#learning-ui-15)] | 4、6 | 真实浏览器逐项系统步骤 | 未执行 | 无 |
| [[learning-ui-16](../packages/learning-ui.md#learning-ui-16)] | 4、6 | 真实浏览器逐项系统步骤 | 未执行 | 无 |
| [[continuity-7](../packages/continuity.md#continuity-7)] | 1、5、6 | `test/db.test.js`、`test/ops.test.js`、离线运行演练 | 未执行 | 无 |
| [[continuity-8](../packages/continuity.md#continuity-8)] | 1、5、6 | `test/db.test.js`、`test/ops.test.js`、离线运行演练 | 未执行 | 无 |
| [[continuity-9](../packages/continuity.md#continuity-9)] | 1、5、6 | `test/db.test.js`、`test/ops.test.js`、离线运行演练 | 未执行 | 无 |
| [[continuity-10](../packages/continuity.md#continuity-10)] | 1、5、6 | `test/db.test.js`、`test/ops.test.js`、离线运行演练 | 未执行 | 无 |
| [[continuity-11](../packages/continuity.md#continuity-11)] | 1、5、6 | `test/db.test.js`、`test/ops.test.js`、离线运行演练 | 未执行 | 无 |
| [[continuity-12](../packages/continuity.md#continuity-12)] | 1、5、6 | `test/db.test.js`、`test/ops.test.js`、离线运行演练 | 未执行 | 无 |

### 本轮文档补全检查

| 日期 | 检查 | 结果 |
| --- | --- | --- |
| 2026-11-11 | `spex lint` | 退出码 0，无问题 |
| 2026-11-11 | 两份 IR 的章节、状态及引用检查 | 通过；业务验证清单覆盖 44 条，实施项均未勾选 |
| 2026-11-11 | Node.js 24.22.2 下 `npm test` | 退出码 0，36 项通过，0 失败、0 跳过；只验证现有基线 |
| 2026-11-11 | `git diff --check` 与工作区检查 | 通过；本轮只改两份 IR，没有代码、测试或数据库变更 |

### 实施执行记录

| 任务 | 状态 | 证据 | 未完成原因 |
| --- | --- | --- | --- |
| 1：存储与迁移 | 未开始 | 无 | 等待用户审阅确认 |
| 2：报名接口 | 未开始 | 无 | 等待用户审阅确认 |
| 3：观看资格 | 未开始 | 无 | 等待用户审阅确认 |
| 4：学习页面 | 未开始 | 无 | 等待用户审阅确认 |
| 5：数据演练 | 未开始 | 无 | 等待用户审阅确认 |
| 6：完整回归 | 未开始 | 无 | 等待用户审阅确认 |
| 7：交付归档 | 未开始 | 无 | 等待用户审阅确认 |
