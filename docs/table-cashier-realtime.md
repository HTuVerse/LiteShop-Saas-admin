# 桌位收银实时连接

桌位收银进入某桌后，通过 `/table-session/detail/{sessionNo}` 获取该桌的会话票据，再连接 `/ws/table-session`。收银员的加菜、改数量、删除和清空使用 `/shared-cart`；提交订单、加菜和退菜由餐饮服务在事务提交后向该会话广播，页面据此重新读取订单和购物车。

本地开发由 Vite 将同源 `/ws` 代理到 `ws://localhost:9090`。生产环境须将同源 `/ws/table-session` 升级连接转发到餐饮服务 WebSocket 端口；若使用独立域名，可在构建时设置 `VITE_WS_BASEURL=wss://...`，值不含 `/ws/table-session`。

上线前先执行后端数据库迁移 `sql/vertical-split/77_table_cashier_operator_audit.sql`，再部署餐饮服务和前端。该迁移为订单、加退菜事件及退款单添加操作人快照字段。既有历史记录的操作人为空，不会被猜测为会员。
