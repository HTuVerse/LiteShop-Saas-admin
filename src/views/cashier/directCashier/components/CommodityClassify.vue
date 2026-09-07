<template>
  <div class="commodity-classify">
    <ElCard shadow="never" v-loading="loading">
      <ElScrollbar>
        <div class="classify-list">
          <div
            v-for="item in categoryList"
            :key="item.id"
            class="classify-item"
            :class="{ active: activeId === item.id }"
            @click="handleClick(item.id)"
          >
            {{ item.categoryName }}
          </div>
          <div
            v-if="categoryTotal > categoryList.length - 1 && categoryList.length > 1"
            class="classify-item load-more"
            @click="loadCategoryList(true)"
          >
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </div>
        </div>
      </ElScrollbar>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElCard, ElScrollbar } from 'element-plus'
  import { fetchCategoryList } from '@/api/cashier'
  import { normalizeCategoryList } from '@utils/cashier/utils'

  // 定义事件
  const emit = defineEmits(['change'])

  // 当前选中的分类ID
  const activeId = ref(0)

  // 加载状态
  const loading = ref(false)

  // 分类列表
  const categoryList = ref<any[]>([{ id: 0, categoryName: '全部', icon: 'all' }])

  // 当前加载页（分页接口，每页 50 条）
  const categoryPage = ref(1)
  const categoryTotal = ref(0)
  const loadingMore = ref(false)

  const mapRecord = (cat: any) => ({
    id: cat.id,
    categoryName: cat.categoryName,
    icon: cat.icon || ''
  })

  const cashierStoreId = inject<import('vue').Ref<number | undefined>>('cashierStoreId')
  // 加载分类数据（append=true 时追加下一页，用于懒加载）
  const loadCategoryList = async (append = false) => {
    if (!append) loading.value = true
    else loadingMore.value = true
    try {
      const page = append ? categoryPage.value + 1 : 1
      const res = await fetchCategoryList({
        currentPage: page,
        pageSize: 50,
        storeId: cashierStoreId?.value
      })
      const records = res?.records || []
      if (append) {
        categoryList.value = categoryList.value.concat(records.map(mapRecord))
      } else {
        categoryList.value = normalizeCategoryList(records)
      }
      categoryPage.value = page
      categoryTotal.value = res?.total ?? 0
    } catch (error: any) {
      console.error('加载分类失败:', error)
      if (!append) categoryList.value = [{ id: 0, categoryName: '全部', icon: 'all' }]
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  // 点击分类
  const handleClick = (id: number) => {
    activeId.value = id
    emit('change', id)
  }

  // 初始化
  onMounted(() => {
    loadCategoryList()
  })
</script>

<style scoped lang="scss">
  .commodity-classify {
    :deep(.el-card) {
      border: 0;
      border-radius: 12px;
    }

    :deep(.el-card__body) {
      padding: 7px 9px;
    }

    // 隐藏 ElScrollbar 的滚动条但保持滚动功能
    :deep(.el-scrollbar__bar) {
      display: none;
    }
  }

  .classify-list {
    display: flex;
    gap: 7px;
    white-space: nowrap;
  }

  .classify-item {
    padding: 7px 16px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    cursor: pointer;
    user-select: none;
    background-color: var(--el-fill-color-light);
    border: 1px solid transparent;
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
    }

    &.active {
      color: #fff;
      background-color: var(--el-color-primary);
      box-shadow: 0 6px 14px var(--el-color-primary-light-7);
    }

    &.load-more {
      color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
    }
  }
</style>
