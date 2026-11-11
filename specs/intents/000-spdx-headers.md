<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai> -->
<!-- spex-i18n-source: specs/intents/000-spdx-headers.md sha256-d2246bb72b8a1be75cf8dd293e80c51e5f5de6f810a8d1fbc71982a52d3fecc3 -->

# IR-000: SPDX 头

## 状态

待审阅（2026-11-11）。
本次补全计划与检查方法，不修改源码、测试或许可规约，不将已有测试通过视为全部许可要求已经验收。
实现任务需用户确认后执行，缺少证据的项目保持未完成。

## 意图

落实 [[licensing-1](../packages/licensing.md#licensing-1)]、[[licensing-2](../packages/licensing.md#licensing-2)] 和 [[licensing-5](../packages/licensing.md#licensing-5)]，按明确的适用范围检查许可证头、保留上游声明，并为项目自编文件使用规定头部。
本记录只安排执行与验证，不改变许可证、版权持有人或适用范围。

- 当前 [[licensing-9](../packages/licensing.md#licensing-9)] 的示例已明确 Apache-2.0 与 linjuanjuan，实施时核验，不重复改写已正确内容。
- 已有 SubLang International 上游声明按 [[licensing-5](../packages/licensing.md#licensing-5)] 保留，不批量替换成项目持有人。
- 当前 `test/repo.test.js` 将 `.gitignore` 纳入检查，并按扩展名与前五行判断；这不足以验证配置排除、原生注释块位置、上游逐字保留及自编文件持有人。
- 测试范围以 [[licensing-6](../packages/licensing.md#licensing-6)] 为依据；若发现其与项目指令不能同时满足，先向用户说明具体冲突并确认，不自行修改规则。
- 不改业务逻辑、数据库、已执行迁移或媒体内容；发现历史迁移头缺失时先确认处理方式，不修改已执行文件。

## 交付项

- [ ] 许可与版权核验记录，确认项目许可证识别及自编头部模板，覆盖 [[licensing-7](../packages/licensing.md#licensing-7)] 与 [[licensing-9](../packages/licensing.md#licensing-9)]。
- [ ] 适用文件与排除文件清单，逐项记录分类理由、上游或自编来源及缺失情况，覆盖 [[licensing-6](../packages/licensing.md#licensing-6)]。
- [ ] 在适用文件中补齐确实缺失的声明，同时保留已有上游声明，覆盖 [[licensing-1](../packages/licensing.md#licensing-1)]、[[licensing-2](../packages/licensing.md#licensing-2)] 与 [[licensing-5](../packages/licensing.md#licensing-5)]。
- [ ] 完整许可集成验证覆盖版权、许可证、上游保留和自编格式，满足 [[licensing-3](../packages/licensing.md#licensing-3)]、[[licensing-4](../packages/licensing.md#licensing-4)]、[[licensing-8](../packages/licensing.md#licensing-8)] 与 [[licensing-10](../packages/licensing.md#licensing-10)]。
- [ ] 保存审计、失败与复测证据，规约检查和全量测试通过后按实际结果更新本记录。

## 任务

每项对应一次提交；先完成分类审计，再修正验证工具，最后按审计结果补齐文件并复核。
提交按项目约定使用中文主题、说明修改原因、引用 IR-000，沿用 Git 身份与签名，并以实际模型署名。

1. **审计许可来源与适用文件**（建议主题：`docs(licensing): 记录许可证头适用范围`）。
   - 使用 `git ls-files -z --cached --others --exclude-standard` 枚举候选文件，按规约分类，区分上游、自编、配置、生成内容、二进制与法律文档。
   - 核对根目录许可证、规定头部和文件来源，记录缺失项；来源不明时先确认，不猜测版权归属。
   - 在 `docs/verification/licensing/` 记录清单与依据，保留后续比较所需的已有声明基线。
   - 没有缺失项时明确记录“无需补头”，不为制造代码变更改动已有文件。

2. **补齐仓库纳入流程的集成检查**（建议主题：`test(licensing): 按规约校验许可证头`）。
   - 调整 `test/repo.test.js` 中与许可规约不一致的筛选与头部检查，保持无 npm 依赖。
   - 使用隔离临时仓库执行真实文件枚举与检查流程，覆盖适用源文件、被排除配置、无注释格式、生成内容和许可证文件。
   - 覆盖 shebang 后首个注释块、原生注释语法、缺失声明、自编持有人及上游已有声明保留，不仅匹配任意前五行文本。
   - 先记录有效失败，再实现检查并复测；不在真实项目内制造缺失头部或修改历史迁移。

3. **补齐缺失头部并归档验收**（建议主题：`chore(licensing): 补齐声明并记录验收`）。
   - 只处理任务 1 已核验的缺失声明，按原生注释语法放在正确位置，已有上游行逐字保留。
   - 需要补齐上游缺失行但缺少可信来源时保留未完成并请求确认。
   - 执行许可集成测试、全量测试、`spex lint` 和差异检查，记录变更前后对比与覆盖矩阵。
   - 没有源文件需要修改时，本提交仅记录验收证据和结果，不虚构修复。

## 验证

### 方法与覆盖

| 验证依据 | 方法 | 成功证据 | 实施状态 |
| --- | --- | --- | --- |
| [[licensing-3](../packages/licensing.md#licensing-3)] | 真实候选文件分类后检查首个注释块，夹具覆盖有无版权声明和排除项 | 清单、分类理由、正反例结果 | 未执行 |
| [[licensing-4](../packages/licensing.md#licensing-4)] | 识别根目录许可证，检查适用文件的许可证标识及位置 | 许可证识别结果、缺失和错误位置被拒绝的日志 | 未执行 |
| [[licensing-8](../packages/licensing.md#licensing-8)] | 对比纳入准备前后的上游声明，验证缺失项使用可信上游来源 | 逐字比较结果与来源记录 | 未执行 |
| [[licensing-10](../packages/licensing.md#licensing-10)] | 自编文件夹具验证原生注释、年份、项目持有人及未解析占位符 | 正确样例通过、错误样例失败的日志 | 未执行 |

- 定向命令：`node --disable-warning=ExperimentalWarning --test test/repo.test.js`。
- 回归命令：`npm test`、`spex lint`、`git diff --check`。
- 记录 Node.js 24 的实际版本、命令、退出码、测试名称、失败原因、修复及复测结果。
- 证据保存到 `docs/verification/licensing/`，使用英文文件名与中文说明，不保存私人配置或凭据。
- 既有测试通过不等于上述四项全部通过，需检查断言和证据是否覆盖要求。
- 只有交付内容及其验证证据完整且通过，才勾选相应交付项；未执行或失败项保持未完成。

### 实施记录

| 任务 | 状态 | 证据 | 未完成原因 |
| --- | --- | --- | --- |
| 1：分类审计 | 未开始 | 无 | 本轮仅补全文档，尚未进行完整来源审计 |
| 2：集成检查 | 未开始 | 无 | 尚未授权修改测试 |
| 3：补头与归档 | 未开始 | 无 | 等待前序审计与实施确认 |

### 文档审阅检查

本节仅记录文档检查和现有代码基线，不代表许可实施任务已完成。

| 日期 | 检查 | 结果 |
| --- | --- | --- |
| 2026-11-11 | `spex lint` | 退出码 0，无问题 |
| 2026-11-11 | 两份 IR 的章节、状态及引用检查 | 通过；业务验证清单覆盖 44 条，实施项均未勾选 |
| 2026-11-11 | Node.js 24.22.2 下 `npm test` | 退出码 0，36 项通过，0 失败、0 跳过；只验证现有基线 |
| 2026-11-11 | `git diff --check` 与工作区检查 | 通过；本轮只改两份 IR，没有代码、测试或数据库变更 |
