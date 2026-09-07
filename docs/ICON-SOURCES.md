# 图标库维护

图标库入口在菜单管理顶部；菜单、菜品分类、会员等级的图标字段也使用同一个选择器。

## 本地资源

- Remix Icon：`@iconify-json/ri` 1.2.10，当前收录 3,229 个图标。[项目主页](https://remixicon.com/)。
- Icons8 Flat Color Icons：`@iconify-json/flat-color-icons` 1.2.3，当前收录 329 个彩色图标。[原始项目与许可](https://github.com/icons8/flat-color-icons)。
- 渲染器：`@iconify/vue`。两套集合由 `src/utils/ui/iconify-loader.ts` 注册，使用时保留图标自身的多色填充，不依赖外网获取这些图标。
- Remix 中文搜索词来自[官方 tags.json](https://github.com/Remix-Design/RemixIcon/blob/master/tags.json)，于 2026-09-04 获取，存放在 `src/config/icon-data/remix-keywords.json`。显示名称在 `src/config/icon-labels.ts` 中补充，彩色图标名称在 `src/config/icon-data/color-labels.ts` 中维护。

## 常用图标与保存

初次使用提供 54 个推荐常用项。任何图标均可点击右上角星标加入、移出“我的常用”，包括推荐项。收藏键使用当前账号 ID，不同账号相互隔离，同一账号在本浏览器内的选择器共享收藏。

收藏只保存在浏览器本地，不会跨设备同步；清除站点数据后会恢复初始推荐项。图标集合不需要导入数据库。业务表单保存的是图标名称，例如 `ri:cake-line`、`flat-color-icons:shop`，中文名和收藏变更不影响业务表中的名称。

## 后续扩充

更新或增加图标集时，在 `src/utils/ui/iconify-loader.ts` 注册集合，并在 `src/config/icon-library.ts` 添加目录及中文名称/关键词，即可被所有选择器使用。收藏默认列表由该文件的 `iconLibrary` 定义；调整默认项不会覆盖用户已有收藏。
