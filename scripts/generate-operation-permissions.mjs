import fs from 'node:fs'
const catalog = JSON.parse(
  fs.readFileSync(new URL('../docs/operation-permissions.json', import.meta.url), 'utf8')
)
const labels = {
  add: '新增',
  edit: '编辑',
  delete: '删除',
  status: '调整状态',
  assign: '分配权限',
  'assign-role': '分配用户角色',
  'reset-password': '重置密码',
  recharge: '余额充值',
  level: '调整会员等级',
  'points-delete': '删除积分记录',
  spec: '维护菜品规格',
  open: '开桌',
  settle: '结算收款',
  clear: '清空会话',
  refund: '退菜',
  gift: '赠菜',
  cancel: '取消订单',
  'add-items': '提交订单 / 加菜',
  print: '打印',
  sync: '同步设备状态',
  default: '设置默认模板',
  send: '发放优惠券',
  verify: '核销优惠券',
  prize: '维护奖品',
  stock: '调整奖品库存',
  chance: '调整抽奖次数',
  'clear-records': '清空抽奖记录',
  refresh: '刷新配置缓存',
  'scheme-add': '新建 / 引用等级方案',
  'scheme-edit': '编辑等级方案',
  'scheme-delete': '删除等级方案',
  'scheme-activate': '启用等级方案'
}
labels.discount = '收银折扣'
const quote = (value) => "'" + value.replaceAll("'", "''") + "'"
const rows = catalog.map((p, i) => {
  const action = p.code.slice(p.code.lastIndexOf(':') + 1)
  if (!labels[action]) throw new Error('Missing label: ' + p.code)
  // 900022~900031 曾属于已合并的餐台控制台。保留这段 ID 空档，
  // 避免为既有环境重新生成脚本时改变后续权限的稳定 ID。
  const stableIndex = i >= 22 ? i + 10 : i
  return `    (${900000 + stableIndex}, ${quote(p.code)}, ${quote(p.parent)}, ${quote(
    labels[action]
  )}, ${stableIndex + 1})`
})
const sql = `-- 操作权限升级。先执行 01~15 对应结构及菜单补丁，再执行本文件。
-- 在发布新版后端之前执行；首次为原来拥有菜单的角色保留其原有操作能力。
-- 仅给本次新增权限补齐旧授权，重跑不会恢复已撤销的角色操作权限。
USE liteshop_user;
DROP PROCEDURE IF EXISTS migrate_operation_permissions_20260904;
DELIMITER $$
CREATE PROCEDURE migrate_operation_permissions_20260904()
BEGIN
  DECLARE conflicts INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    DROP TEMPORARY TABLE IF EXISTS tmp_operation_seed;
    DROP TEMPORARY TABLE IF EXISTS tmp_operation_grants;
    RESIGNAL;
  END;
  CREATE TEMPORARY TABLE tmp_operation_seed (
    id BIGINT PRIMARY KEY, code VARCHAR(100), parent_code VARCHAR(100), title VARCHAR(100), sort INT
  );
  INSERT INTO tmp_operation_seed VALUES
${rows.join(',\n')};
  START TRANSACTION;
  SELECT COUNT(*) INTO conflicts FROM tmp_operation_seed s
    LEFT JOIN sys_permission p ON p.permission_code = s.parent_code
    WHERE p.id IS NULL OR p.permission_type <> 1;
  IF conflicts > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '缺少父菜单，请先补齐菜单数据后重试';
  END IF;
  SELECT COUNT(*) INTO conflicts FROM tmp_operation_seed s
    INNER JOIN sys_permission p ON p.permission_code = s.code
    INNER JOIN sys_permission parent ON parent.permission_code = s.parent_code
    WHERE p.permission_type <> 2 OR p.parent_id <> parent.id;
  IF conflicts > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '已有同编码权限的类型或上级不一致，请先核对';
  END IF;
  DELETE s FROM tmp_operation_seed s INNER JOIN sys_permission p ON p.permission_code = s.code;
  SELECT COUNT(*) INTO conflicts FROM tmp_operation_seed s INNER JOIN sys_permission p ON p.id = s.id;
  IF conflicts > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '操作权限预置ID已被占用，请调整新增权限ID后重试';
  END IF;
  INSERT INTO sys_permission (id, permission_name, permission_code, parent_id, permission_type,
    component_address, router_address, sort, status, is_hide, is_iframe, keep_alive)
  SELECT s.id, s.title, s.code, p.id, 2, NULL, NULL, s.sort, 1, 0, 0, 0
    FROM tmp_operation_seed s INNER JOIN sys_permission p ON p.permission_code = s.parent_code;
  -- Materialize before inserting to avoid reading the target table in a NOT EXISTS subquery.
  CREATE TEMPORARY TABLE tmp_operation_grants AS
  SELECT DISTINCT rp.tenant_id, rp.role_id, s.id AS permission_id
    FROM tmp_operation_seed s INNER JOIN sys_permission p ON p.permission_code = s.parent_code
    INNER JOIN sys_role_permission rp ON rp.permission_id = p.id
    INNER JOIN sys_role r ON r.id = rp.role_id
    WHERE p.status = 1 AND r.role_code <> 'USER';
  INSERT INTO sys_role_permission (tenant_id, role_id, permission_id)
    SELECT tenant_id, role_id, permission_id FROM tmp_operation_grants;
  COMMIT;
  SELECT COUNT(*) AS added_operation_permissions FROM tmp_operation_seed;
  DROP TEMPORARY TABLE tmp_operation_seed;
  DROP TEMPORARY TABLE tmp_operation_grants;
END$$
DELIMITER ;
CALL migrate_operation_permissions_20260904();
DROP PROCEDURE migrate_operation_permissions_20260904;
`
fs.mkdirSync(new URL('../docs/sql/', import.meta.url), { recursive: true })
fs.writeFileSync(new URL('../docs/sql/16_operation_permissions.sql', import.meta.url), sql)
console.log(`Generated ${catalog.length} operation permissions`)
