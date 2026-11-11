<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 liyan <1982119376@qq.com> -->

# IR-001: 报名与观看资格实现

## 状态

待审阅

## 意图

本轮按 [DR-001](../decisions/001-enrollment-and-watch-eligibility.md) 与 [enrollment](../packages/enrollment.md)、[watch](../packages/watch.md) 两个规约包实现报名、我的报名和观看资格，并更新测试与文档。
实现不得改变 DR-001 已确认的产品决策。
若实现中发现需要改变对外行为，应先修订规约并取得确认后再继续。
实现完成后按实际验证结果更新本记录，未执行或未通过的项保持未完成。

## 交付项

- [ ] `migrations/002-enrollments.sql` 新增报名表、账号与课程外键、唯一约束和列表索引。
- [ ] `src/enrollments.js` 提供报名创建、取消、当前账号列表和归属查询，重复操作保持幂等。
- [ ] `src/enrollments.js` 注册报名、取消、当前账号报名列表和“我的报名”页面路由。
- [ ] `src/views/enrollments.js` 渲染“我的报名”列表、课程状态、详情入口和取消操作。
- [ ] `src/views/layout.js` 为已登录账号增加“我的报名”导航入口。
- [ ] `src/views/course.js` 增加“报名后观看”状态和报名入口。
- [ ] `public/js/app.js` 处理报名、取消报名和课程页观看状态切换。
- [ ] `public/css/app.css` 补充报名按钮、我的报名列表和状态样式。
- [ ] `src/playback.js` 在观看资格检查中加入有效报名条件，并把新原因映射为课程页状态。
- [ ] `src/app.js` 接入报名路由，保持现有课程、播放和维护路由不变。
- [ ] `docs/api.md` 补充报名接口、我的报名页面和观看资格变化。
- [ ] `README.md` 与 `docs/operations.md` 更新报名数据、迁移和备份说明。
- [ ] `test/enrollment.test.js` 覆盖 [enrollment](../packages/enrollment.md) 验证章节的全部条目。
- [ ] `test/watch.test.js` 覆盖 [watch](../packages/watch.md) 验证章节的全部条目。
- [ ] `test/admin.test.js` 与 `test/ops.test.js` 更新为“先报名再观看”的新前置条件。
- [ ] 修复测试临时目录清理顺序，使完整 `npm test` 能在当前 Windows 环境完成。
- [ ] 所有新增源文件带 SPDX 头，且不新增 npm 依赖或构建步骤。
- [ ] 执行 `spex lint` 和完整 `npm test`，在 `验证` 章节记录实际结果与未完成项。

## 任务

每个任务对应一次提交，提交信息遵循 [[git-2](../packages/git.md#git-2)] 和 [[git-4](../packages/git.md#git-4)]。

1. 修复测试临时目录清理顺序（`test: 修复临时目录清理顺序`）
   - 调整测试钩子顺序，确保先停止服务并关闭数据库，再删除临时目录。
   - 验证：`node --test test/db.test.js` 通过。
   - 本提交不改变业务行为。

2. 增加报名存储迁移（`feat(db): 增加报名表迁移`）
   - 新增 `migrations/002-enrollments.sql`，实现报名表、唯一约束、外键和列表索引。
   - 验证：`node --test test/db.test.js` 通过，启动临时数据目录后无待执行迁移。
   - 更新交付项 1。

3. 实现报名领域与接口（`feat(enrollment): 实现报名接口与归属`）
   - 新增 `src/enrollments.js`，注册报名、取消和当前账号列表接口，全部以会话账号限定归属。
   - 新增 `test/enrollment.test.js`，覆盖创建、幂等、未发布或不存在、取消、重新报名和归属隔离。
   - 验证：`node --test test/enrollment.test.js` 通过，现有测试不回归。
   - 更新交付项 2、3。

4. 添加我的报名页面（`feat(enrollment): 添加我的报名页面`）
   - 新增 `src/views/enrollments.js`，接入导航、页面路由、取消操作和样式。
   - 扩展 `test/enrollment.test.js`，覆盖列表、课程状态、详情入口、取消和未登录访问。
   - 验证：`node --test test/enrollment.test.js` 通过。
   - 更新交付项 4、5、7、8。

5. 实现报名后的观看资格（`feat(watch): 要求报名后才能观看`）
   - 修改 `src/playback.js` 的观看资格检查，更新课程页状态、报名入口和客户端交互。
   - 更新 `test/watch.test.js`、`test/admin.test.js` 和 `test/ops.test.js`，覆盖访问矩阵、管理员、公开浏览、撤销边界和页面一致性。
   - 验证：`node --test test/watch.test.js test/admin.test.js test/ops.test.js` 通过，完整 `npm test` 通过。
   - 更新交付项 6、9、10、14、15。

6. 补齐持久化与升级验证（`test(enrollment): 覆盖重启与升级延续`）
   - 扩展 `test/enrollment.test.js`，使用真实 SQLite、服务重启和既有数据库副本验证报名持久化与数据延续。
   - 验证：`node --test test/enrollment.test.js` 通过。
   - 更新交付项 13。

7. 更新接口与运维文档（`docs: 补充报名与观看说明`）
   - 更新 `docs/api.md`、`README.md` 和 `docs/operations.md`，说明报名接口、观看前置条件、迁移和备份内容。
   - 验证：人工校对，`spex lint` 通过。
   - 更新交付项 11、12。

8. 完成全量验证并更新 IR（`docs(intents): 更新 IR-001 验证结果`）
   - 运行 `spex lint` 和完整 `npm test`，记录命令、通过数量和未通过项。
   - 只勾选实际执行且通过的交付项，未执行或未通过项保持未完成。
   - 更新交付项 16、17、18，并在 `验证` 章节写入证据。

## 验证

- [ ] `npx --no-install @sublang/spex lint` 输出 `no problems found`。
- [ ] `npm test` 完整通过，记录测试文件数、通过数和失败数。
- [ ] `node --test test/enrollment.test.js` 通过，覆盖报名生命周期、归属、持久化和升级延续。
- [ ] `node --test test/watch.test.js` 通过，覆盖观看资格、公开浏览、播放授权和撤销边界。
- [ ] `node --test test/admin.test.js test/ops.test.js` 通过，确认课程管理和运维流程在报名前置条件下正常。
- [ ] 手动烟雾测试：启动临时数据目录，登录学员，报名课程，取得播放地址，取消报名并确认新播放地址被拒绝；记录 HTTP 状态和关键响应。
- [ ] 重启烟雾测试：报名后停止并重启服务，重新登录并确认报名仍在；记录命令和结果。
- [ ] 证据：在下方记录执行日期、命令、关键输出和未通过项；未执行或未通过的验证保持未勾选。

### 证据

待执行。