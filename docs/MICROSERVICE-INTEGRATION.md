# LiteShop 微服务管理端对接说明

`liteS` 是 `liteShop_admin_miniSer` 的管理前端。界面沿用旧单体管理端的业务布局，登录、租户、权限、门店范围和接口参数以微服务后端为准。

## 本地启动

1. 启动 Nacos、数据库、Redis 及所需微服务，再启动网关。后端默认网关地址为 `http://localhost:8080`。
2. 在本目录执行 `pnpm install` 和 `pnpm dev`。
3. 开发环境将 `/api/*` 代理到 `VITE_API_PROXY_URL`，并在转发时去掉 `/api` 前缀。需要其他网关地址时修改 `.env.development`。

未启动真实后端时可使用显式测试桩：

```powershell
pnpm run fixture:gateway
```

另一个终端将 `VITE_API_PROXY_URL` 设为 `http://127.0.0.1:18080` 后启动前端。测试账号为 `platform`、`merchant`、`staff`、`expired`，密码均为 `mock123`。该脚本只用于本地联调，不会被生产代码导入。

## 会话与租户

- 登录调用 `POST /user/admin/Login`，账号和密码按查询参数提交；验证码登录使用 `POST /user/admin/phoneOrEmailVerifyCodeLogin`。
- 商户及门店账号先取得一次性的 `selectionTicket`，再调用 `POST /user/admin/select-tenant`；只有一个商户时也保留选择步骤。平台账号直接取得正式会话。票据只存内存，选定或失败后立即清除。
- Sa-Token 使用 `satoken` 请求头。管理端不发送 `tenantId`、`X-Tenant-Id` 或 `X-Public-Tenant-Id`；租户范围由服务端登录会话决定。
- 平台管理员进入商户调用 `/sys-tenant/{id}/enter`，返回平台调用 `/sys-tenant/exit`。切换范围时会清理动态路由、工作标签、收银门店和旧请求响应。
- 后端 Snowflake ID 可能超过 JavaScript 安全整数。HTTP 层使用无损 JSON 解析，所有 ID 在前端按字符串传递。

## 权限与业务范围

- 菜单从 `/sys-permission/getCurrentUserMenus` 获取并转换为 Vue Router 动态路由。
- 平台超级管理员在“平台管理 → 菜单管理”维护全局 `sys_permission`。已有数据库先执行后端 `sql/vertical-split/10_add_permission_management_menu.sql` 补充入口；新数据库的 `08_seed_development.sql` 已包含该菜单。按钮和 API 权限作为菜单子节点参与角色授权，不会生成页面路由。
- `SUPER_ADMIN` 在平台视角管理商户，进入商户后处理业务；`ADMIN` 管理当前商户；门店角色只显示后端已开放且与其 `storeIds` 相符的功能。
- 用户、角色、菜单权限、员工门店授权、会员等级、门店、分类、菜品、餐桌、订单、收银、打印、优惠券、抽奖、应用配置和经营分析均使用微服务接口。
- 收银前必须显式选择门店；挂单按账号、商户和门店隔离。资金、核销和抽奖类写请求不自动重试，避免重复扣款或重复核销。
- 图片上传统一调用 `/file-upload/upload/image`，表单字段名为 `file`。AI 接口 `/ai/status` 和 `/ai/chat` 返回原始 JSON，HTTP 层单独按原始响应处理。

接口静态审计结果写入 `docs/backend-contract.json`。执行以下命令可重新生成并检查前端接口是否能在后端控制器中找到：

```powershell
pnpm run check:contracts
```

## 生产部署

生产构建使用相对接口前缀 `/api`：

```powershell
pnpm build
```

Nginx 可将静态资源和网关配置为：

```nginx
location /api/ {
    proxy_pass http://gateway:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

项目使用 hash 路由，`try_files` 仍建议保留以支持静态资源和后续路由模式调整。生产环境不得把本地测试网关或测试凭据写入部署配置。

## 验证

```powershell
pnpm run typecheck
pnpm run test:integration
pnpm run check:contracts
pnpm build
```

集成测试覆盖超长 ID、角色菜单、合法 ZIP 导出、请求参数与认证头、资金请求不重试、401 单次退出、切换租户时取消旧响应以及 AI 原始响应。

## 后端租户处理约定

- HTTP 请求、Feign 和 RabbitMQ 使用同一套租户上下文。缺少租户时拒绝业务表访问；每次请求或消费结束后清理租户、门店和过滤旁路。
- 平台全局视角可以执行平台操作。进入商户后恢复 `tenant_id` 过滤，平台账号身份仍保留；商户停用后允许平台退出该商户。
- `X-Internal-Call` 是服务之间的共享凭据。网关删除外部请求的全部内部租户/门店头，直接访问内部服务同样必须验证凭据。
- `sys_role`、`sys_user_role`、`sys_role_permission` 均按租户过滤。创建商户时，四种默认角色始终写入新商户的范围。
- 门店数据权限处理器已注册。限制门店的账号只可访问已授权门店，无授权时返回空范围。
- 配置缓存按租户分开并延迟加载，刷新或更新只影响当前商户。配置字符串放在响应的 `data` 中。

Nacos 的 `liteshop-shared.yml` 需包含以下配置（仓库模板已更新），各微服务进程注入相同的 `INTERNAL_CALL_SECRET`：

```yaml
liteshop:
  tenant:
    enabled: true
  internal-call:
    secret: ${INTERNAL_CALL_SECRET:}
```

空凭据会使内部调用失败。应合并上述配置到已有 Nacos 配置，保留现有数据库和其他服务参数。前端不接触此凭据。

## 真实联调与复验

2026-09-02 完成全模块编译测试，共 39 项通过；前端 10 项测试通过；静态审计覆盖 277 个后端端点、200 处前端调用，未发现未匹配调用。生产构建和类型检查已通过。原后端 `target` 存在文件锁，本次使用 `.test-output/backend-src` 的隔离副本编译，修改均已写回 `liteShop_admin_miniSer` 源码。

真实服务使用本机 Nacos、MySQL、Redis 和 RabbitMQ，经网关验证以下场景；结果见 [联调记录](live-tenant-verification.json)：

1. 在已进入商户的情况下创建新商户，四个默认角色归属正确。
2. 两个商户使用相同门店编码、配置键和管理账号。
3. 同账号选择不同商户；一次性登录票据不能重放。
4. 跨商户门店与用户的查询、修改被拒绝。
5. 网关清除伪造内部头；直接内部接口拒绝无凭据请求。
6. 公开商户入口校验，以及配置缓存和更新的租户隔离。
7. 店员只访问授权门店；同租户的其他门店仍不能访问。
8. 停用商户后拒绝业务访问，平台仍能退出该商户。

可使用 `pnpm run test:live-tenancy` 复验。脚本只连接本机服务，创建两个临时商户和测试数据，并在结束时按本次创建的租户 ID 清理。需要平台测试账号及本机 MySQL 客户端，用于清理测试数据；不会重建已有数据库。

```powershell
$env:LITESHOP_TEST_ACCOUNT = 'superadmin'
$env:LITESHOP_TEST_PASSWORD = '<本地平台测试账号密码>'
$env:LITESHOP_TEST_TENANT_ID = '1001' # 已有演示商户，仅用于进入其视角
$env:MYSQL_BIN = '<mysql.exe 的完整路径>'
$env:MYSQL_USERNAME = '<本地数据库账号>'
$env:MYSQL_PWD = '<本地数据库密码>'
pnpm run test:live-tenancy
```

默认网关为 `http://127.0.0.1:8080`，用户服务为 `http://127.0.0.1:9001`，可分别通过 `LITESHOP_GATEWAY_URL`、`LITESHOP_USER_SERVICE_URL` 覆盖。本次运行报告和临时数据清理检查点写入 `.test-output/live-tenancy`。若进程被外部强制中断，先按检查点处理本次残留数据，脚本会阻止直接重复创建。

2026-09-03 补充完成消息服务修复及 4 项回归测试，累计 43 项后端测试通过。未配置邮件/短信时服务仍可启动，发送接口返回明确的 503 业务错误；邮件投递失败会向上抛出，不缓存验证码、不记录发送成功。填写 `MAIL_*`、`SMS_*` 后重启消息服务启用对应通道。本机 Nacos 已合并消息配置的空值默认项，现有其他配置保持原值。

最终前端类型检查和生产构建通过（Vite 构建 31.27 秒）。实际页面已验证商户密码登录、选择商户、动态菜单、工作台、门店、订单、基础配置，以及平台账号进入商户后恢复业务菜单、退出后恢复平台菜单。短信/邮件实际投递、第三方支付扣款及实体打印未执行，需在对应通道配置和设备可用时单独验收。

## 2026-09-03 业务修复补充

发券、餐桌状态、角色权限、门店授权、图标库、会员等级方案、租户默认配置和 Art 组件统一的改动及迁移顺序见 [业务修复与部署说明](BUSINESS-FIXES-20260903.md)。这批改动尚未部署到真实服务；会员等级需要先由用户执行 12_member_level_schemes.sql。上方旧版真实联调记录不代表这批新接口已经完成真实数据库验证。
