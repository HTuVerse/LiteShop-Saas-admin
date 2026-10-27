<!-- 动态表格渲染：按 AI 返回的受控列与行，用 ArtTable 展示真实经营明细 -->
<template>
  <div class="dashboard-table">
    <ArtTable
      :data="tableData"
      :columns="columns"
      :border="true"
      size="small"
      :show-table-header="false"
      empty-text="暂无可展示的明细数据"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { AiDashboardTable } from '@/api/ai'
  import type { ColumnOption } from '@/types'

  defineOptions({ name: 'DashboardTable' })

  const props = defineProps<{ table: AiDashboardTable }>()

  // 为每列生成稳定的字段名，缺失 key 时按下标兜底
  const columnKeys = computed(() =>
    props.table.columns.map((col, index) => col.key || `col_${index}`)
  )

  const columns = computed<ColumnOption[]>(() =>
    props.table.columns.map((col, index) => ({
      prop: columnKeys.value[index],
      label: col.label,
      align: col.align || (col.numeric ? 'right' : 'left'),
      minWidth: 90,
      showOverflowTooltip: true
    }))
  )

  // 行单元格按列顺序对齐，组装为 ArtTable 需要的对象数组
  const tableData = computed<Record<string, string>[]>(() =>
    props.table.rows.map((row) => {
      const record: Record<string, string> = {}
      columnKeys.value.forEach((key, index) => {
        record[key] = row[index] ?? ''
      })
      return record
    })
  )
</script>

<style scoped lang="scss">
  .dashboard-table {
    width: 100%;

    :deep(.art-table) {
      height: auto;
    }
  }
</style>
