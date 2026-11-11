<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com> -->

# learning-ui: 报名与观看的学习页面

## 意图

本包依据 [DR-001](../decisions/001-self-service-enrollment.md) 和 [DR-002](../decisions/002-enrollment-watch-eligibility.md) 定义公开课程到个人报名及观看的页面闭环。
不引入报名历史、搜索、筛选、批量操作或跨标签页即时推送。

## 外部行为

### learning-ui-1

当浏览课程目录或详情，学习页面应继续展示公开课程信息 [[courses-2](courses.md#courses-2)]并按当前观看资格 [[playback-1](playback.md#playback-1)]呈现操作：

| 身份及状态 | 操作 |
| --- | --- |
| 游客 | 详情显示“登录后报名”，目录说明学员登录并报名后观看 |
| 学员未报名或已取消 | 详情显示“立即报名” |
| 学员有效报名且课程已发布 | 详情显示“开始观看” |
| 管理员 | 说明观看仅面向已报名学员，不展示报名或观看按钮 |

- 未发布课程沿用公开详情 404 [[courses-3](courses.md#courses-3)]。
- 初始页面不含播放授权，文案不再承诺登录即可观看。

### learning-ui-2

当游客点击“登录后报名”，学习页面应进入带原课程 next 的登录流程 [[identity-6](identity.md#identity-6)]，成功回到课程后仍由学员主动提交报名，不自动报名或播放。

### learning-ui-3

当学员点击“立即报名”，学习页面应调用本人报名操作 [[enrollment-3](enrollment.md#enrollment-3)]并在确认成功后更新为可观看状态 [[playback-1](playback.md#playback-1)]，失败时显示中文原因且不声称报名成功。

### learning-ui-4

当学员访问“我的报名”，学习页面应根据当前会话身份 [[identity-3](identity.md#identity-3)]提供仅限本人的当前报名列表 [[enrollment-7](enrollment.md#enrollment-7)]：

- 学员导航显示“我的报名”入口，游客访问该页面跳转带安全 next 的登录页，管理员访问返回 403。
- 已发布课程提供进入详情和取消报名操作。
- 下架课程标示“课程暂不可用”，保留取消操作，不提供详情或观看入口。
- 空集合显示暂无报名并提供返回课程目录的入口。

### learning-ui-5

当学员在“我的报名”取消报名，学习页面应在操作前明确告知将失去观看资格，并调用本人取消操作 [[enrollment-5](enrollment.md#enrollment-5)]，确认成功后移除该项，失败时显示中文原因且不误报成功。

### learning-ui-6

当学员点击“开始观看”，播放器应申请播放授权 [[playback-2](playback.md#playback-2)]并带当前会话读取视频 [[playback-3](playback.md#playback-3)]，加载成功后显示有控件的播放器，浏览器阻止自动播放时提示手动播放。

### learning-ui-7

如果视频因播放地址到期而读取失败，当播放器尝试恢复，播放器应重新申请当前资格允许的播放授权 [[playback-2](playback.md#playback-2)]并从已记录进度继续，保留原播放或暂停意图：

- 不同时发起多个恢复流程。
- 连续恢复失败最多自动重试两次，随后提示刷新重试。
- 申请返回 401 时提示登录状态失效并转到带当前课程 next 的登录页 [[identity-6](identity.md#identity-6)]，其他拒绝显示中文原因且不绕过资格限制。

### learning-ui-8

当学习页面处理报名或观看交互，页面应以安全中文文本显示状态 [[web-contract-4](web-contract.md#web-contract-4)]，在请求进行中禁用对应提交按钮，操作完成后恢复可操作状态，并让状态或错误提示可被辅助技术读取。

## 验证

### learning-ui-9

给定真实账号、课程和报名状态，当系统测试逐种身份浏览目录与详情，测试应断言课程介绍仍公开、按钮和文案符合状态且初始 HTML 不含播放授权 [[learning-ui-1](#learning-ui-1)]。

### learning-ui-10

给定未报名账号和公开课程，当系统测试从详情完成登录，测试应断言回到原课程且报名仍为空，只有主动点击才提交报名 [[learning-ui-2](#learning-ui-2)]。

### learning-ui-11

给定真实报名服务，当系统测试完成成功报名并模拟提交期间课程下架或会话到期，测试应断言成功后可开始观看，失败时不误报成功且后续状态与服务端一致 [[learning-ui-3](#learning-ui-3)]。

### learning-ui-12

给定游客、管理员及两个报名不同课程的学员，当系统测试访问个人列表、下架课程和空列表，测试应断言访问限制、归属、操作入口及空状态正确 [[learning-ui-4](#learning-ui-4)]。

### learning-ui-13

给定本人有效报名和真实服务，当系统测试执行取消及触发取消请求失败，测试应断言后果提示可见、成功项目移除且失败不会被呈现为已成功取消 [[learning-ui-5](#learning-ui-5)]。

### learning-ui-14

给定真实报名与媒体服务，当系统测试点击观看并检查浏览器媒体请求，测试应断言先申请授权再携会话读取、播放器可操作且自动播放被阻止时显示手动播放提示 [[learning-ui-6](#learning-ui-6)]。

### learning-ui-15

给定短期真实授权与浏览器，当系统测试等待授权过期并触发新片段请求、随后使资格失效及连续恢复失败，测试应断言有效资格恢复进度、失效资格不继续取流、401 回到登录及重试次数受限 [[learning-ui-7](#learning-ui-7)]。

### learning-ui-16

给定浏览器与真实服务，当系统测试重复点击提交并检查成功、失败和特殊字符提示，测试应断言进行中按钮禁用、失败可重试、文本不执行脚本且提示具有状态或警告语义 [[learning-ui-8](#learning-ui-8)]。
