# Browser Session MCP 0.5.0 发布说明 / Release Notes

发布日期 / Released: 2026-09-24

新增观测修订号、动作效果分类、标签页来源、迟到响应对账与统一错误码前缀；弹窗提供「复制 Agent 指南」。没有新增扩展权限。

## 主要变化 / Highlights

- **观测修订号**：`snapshot` 返回 `revision`（URL、标题、可交互元素数、文本量的指纹）。`click` / `type` / `press_key` / `scroll` 可携带 `expectRevision`，不匹配即以 `STALE_OBSERVATION` 拒绝，动作不执行。修订号不含滚动位置，滚动不会使观测过期。
- **动作效果**：动作结果新增 `effect`：`navigation` / `dom_changed` / `input_dispatched` / `scrolled` / `no_visible_change` / `unknown`。后置指纹注入失败时回退比对标签页 URL。
- **标签页来源**：`navigate` 支持 `newTab: true`，不再只能操作当前标签页；`tabs_list` 逐行标注 `origin: agent | user`，来源随 `storage.session` 持久化，标签页关闭即清理。
- **迟到响应对账**：超时请求的 id 被保留；扩展的迟到应答记入 `connection_status.lateResponses`（`timed_out_late_success` / `timed_out_late_error` / `timed_out_late_transport_closed`，含 `lateMs` 与 `nextAction`），用于确认动作是否最终执行。
- **错误码前缀**：扩展侧错误统一为 `INVALID_PARAMS` / `TAB_NOT_FOUND` / `NO_ACTIVE_TAB` / `INJECTION_FAILED` / `ELEMENT_NOT_FOUND` / `STALE_OBSERVATION` / `SCREENSHOT_FAILED` / `ACTION_FAILED` / `UNKNOWN_TOOL`，与服务器侧 `RESPONSE_TIMEOUT` / `RESULT_TOO_LARGE` / `EVALUATE_*` 约定一致。
- **复制 Agent 指南**：弹窗按钮生成自包含接入说明（扩展 id、端口、`mcpServers` 配置、验证步骤、行为约定）。

## 测试 / Tests

- `npm test` 离线全绿：server 37 / bridge 8 / disconnect 4 / connections 1 / late-response 7（新增）/ extension-transport 107 / doctor 3 / limits 3 / packaging 7。
- 新增覆盖：`expectRevision` 拒绝、`effect` 分类、`origin` 持久化与清理、迟到响应三态、弹窗 Agent 指南文本。

## 已知限制 / Known limitations

- `revision` 是结构指纹：同 URL 下元素数与文本量不变的局部 DOM 变化不会使观测过期。
- `effect` 为尽力而为：晚于后置指纹读取才落地的异步渲染会报 `no_visible_change`。
- 受保护页面不可注入；`about:` 页面不可操作；CSP 禁止 eval 时 `evaluate` 走隔离世界或返回错误。
- 本机回环通信仍是数据传输，不自动豁免远程代码相关商店政策。
