# 组件参考与页面约定

主项目：D:/code_practice/liteS。组件示例：D:/Microsoft Edge Download/art-design-pro-main/art-design-pro-main。旧业务界面：D:/code_practice/liteShop_admin/art-design-pro - 副本 (2)。

用户要求日常编码优先复用主项目已有组件，参考上述示例；业务页面沿用旧版布局，避免无要求的重新设计。

- 搜索栏、表格工具栏、表格：ArtSearchBar、ArtTableHeader、ArtTable。
- 表单、操作按钮、图标：ArtForm、ArtButtonTable、ArtSvgIcon。
- 示例 src/views/examples/tables/tree.vue 使用 ElTree 和 ElScrollbar；层级拖动使用同一套 Element Plus 树组件的拖拽能力。
- 示例 src/views/widgets/drag/index.vue 展示 VueDraggable 的平面排序；主项目已安装 vue-draggable-plus，无须新增依赖。
- 菜单管理保持搜索栏加树表、860px 双列表单布局。新增层级调整使用独立弹窗。
- src/config/menu-pages.ts 只提供编辑器的页面选项。侧栏和动态路由只能来自当前用户菜单接口，不能把组件示例或页面选项自动加入侧栏。

## 表单、表格和图标字段

业务页面统一使用 ArtForm 和 ArtTable。已有复杂业务布局使用默认插槽保留原排版；新建常规表单可使用 items 配置。ArtForm 的 validate、resetFields、clearValidate、validateField、scrollToField 直接转发底层表单，已有校验和提交事件可以继续使用。

```vue
<ArtForm ref="formRef" :model="form" :rules="rules" label-width="100px">
  <ElFormItem label="名称" prop="name"><ElInput v-model="form.name" /></ElFormItem>
  <ElFormItem label="图标"><ArtIconPicker v-model="form.icon" /></ElFormItem>
</ArtForm>
<ArtTable :data="rows" row-key="id" :loading="loading">
  <ElTableColumn prop="name" label="名称" />
  <ElTableColumn label="操作">
    <template #default="{ row }">
      <ElButton type="primary" plain size="small" @click="edit(row)">编辑</ElButton>
    </template>
  </ElTableColumn>
</ArtTable>
```

ArtIconPicker 的 allow-image 属性用于同时接受图片地址的字段；纯菜单图标省略该属性。常用图标条目统一维护在 src/config/icon-library.ts，新增条目带中文名称和分类，随后所有图标选择器自动可用。ArtForm 的 items 同样可设置 type: 'icon'，并在 props 中传 allowImage。

ArtButtonTable 用于紧凑图标按钮，使用 type 或显式 label 提供操作名称；ElButton 用于需要文字的操作按钮，保留边框或背景，避免使用 link/text 形式。ArtTable 的默认插槽模式支持 ElTableColumn 及原有选择/展开事件；工具栏继续使用 ArtTableHeader。
