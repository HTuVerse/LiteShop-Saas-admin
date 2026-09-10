<template>
  <ElDialog v-model="dialogVisible" :title="`${planName} · 版本记录`" width="900px" align-center>
    <div class="version-tip">
      已发布版本保持不可变；修改价格或门店额度时，请基于当前版本创建草稿。
    </div>
    <ArtTable
      :data="tableData"
      :columns="columns"
      empty-text="暂无版本，请先新建"
      max-height="440"
      size="small"
    />
    <template #footer>
      <ElButton @click="dialogVisible = false">关闭</ElButton>
      <ElButton type="primary" :disabled="!canCreate" @click="emit('create')">新建版本</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElButton, ElTag } from 'element-plus'
  import { h } from 'vue'
  import { useTable } from '@/hooks/core/useTable'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import type { SaasPlanVersion } from '@/api/saas'

  const props = withDefaults(
    defineProps<{
      planName?: string
      versions?: SaasPlanVersion[]
      canCreate?: boolean
    }>(),
    { planName: '', versions: () => [], canCreate: false }
  )
  const emit = defineEmits<{
    edit: [row: SaasPlanVersion]
    publish: [row: SaasPlanVersion]
    remove: [row: SaasPlanVersion]
    create: []
  }>()
  const dialogVisible = defineModel<boolean>('visible', { default: false })
  const statusText = (value: SaasPlanVersion['status']) =>
    ({ DRAFT: '草稿', PUBLISHED: '已发布', RETIRED: '已下架' })[value] || value
  const { data: tableData, columns } = useTable({
    core: {
      dataSource: () => props.versions,
      columnsFactory: () => [
        { prop: 'versionNo', label: '版本', width: 75, formatter: (row) => `v${row.versionNo}` },
        {
          prop: 'status',
          label: '状态',
          width: 95,
          formatter: (row) =>
            h(
              ElTag,
              {
                type:
                  row.status === 'PUBLISHED'
                    ? 'success'
                    : row.status === 'DRAFT'
                      ? 'warning'
                      : 'info'
              },
              () => statusText(row.status)
            )
        },
        { prop: 'monthlyPrice', label: '月付价格', width: 100 },
        { prop: 'yearlyPrice', label: '年付价格', width: 100 },
        { prop: 'currency', label: '币种', width: 65 },
        { prop: 'publishedAt', label: '发布时间', minWidth: 155 },
        {
          prop: 'operation',
          label: '操作',
          width: 190,
          fixed: 'right',
          formatter: (row) =>
            h('div', { class: 'operation-buttons' }, [
              h(ArtButtonTable, {
                type: 'edit',
                label: row.status === 'DRAFT' ? '编辑' : '查看',
                onClick: () => emit('edit', row)
              }),
              row.status === 'DRAFT'
                ? h(ArtButtonTable, {
                    icon: 'ri:send-plane-line',
                    iconClass: 'bg-success/12 text-success',
                    label: '发布',
                    onClick: () => emit('publish', row)
                  })
                : null,
              row.status === 'DRAFT'
                ? h(ArtButtonTable, {
                    type: 'delete',
                    label: '删除草稿',
                    onClick: () => emit('remove', row)
                  })
                : null
            ])
        }
      ]
    }
  })
</script>

<style scoped>
  .version-tip {
    padding: 8px 10px;
    margin-bottom: 10px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border-radius: 6px;
  }

  :deep(.operation-buttons) {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;
  }
</style>
