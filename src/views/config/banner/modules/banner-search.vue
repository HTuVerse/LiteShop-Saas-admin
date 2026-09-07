<!-- 轮播图搜索组件 -->
<template>
  <ElCard class="search-card mb-4" shadow="never">
    <ArtForm :model="form" inline>
      <ElFormItem label="轮播图位置">
        <ElSelect v-model="form.position" placeholder="全部位置" clearable style="width: 160px">
          <ElOption
            v-for="item in positionOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSelect v-model="form.status" placeholder="全部状态" clearable style="width: 120px">
          <ElOption label="启用" :value="1" />
          <ElOption label="禁用" :value="0" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" @click="handleSearch" v-ripple>
          <i class="i-ep:search mr-1"></i>
          搜索
        </ElButton>
        <ElButton @click="handleReset" v-ripple>
          <i class="i-ep:refresh mr-1"></i>
          重置
        </ElButton>
      </ElFormItem>
    </ArtForm>
  </ElCard>
</template>

<script setup lang="ts">
  interface SearchForm {
    position?: number
    status?: number
  }

  const form = defineModel<SearchForm>({ required: true })

  const emit = defineEmits<{
    search: []
    reset: []
  }>()

  // 位置选项
  const positionOptions = [
    { label: '首页轮播图', value: 1 },
    { label: '点餐页轮播图', value: 2 },
    { label: '个人中心轮播图', value: 3 },
    { label: '活动页轮播图', value: 4 }
  ]

  const handleSearch = () => {
    emit('search')
  }

  const handleReset = () => {
    form.value = {
      position: undefined,
      status: undefined
    }
    emit('reset')
  }
</script>

<style lang="scss" scoped>
  .search-card {
    :deep(.el-card__body) {
      padding-bottom: 0;
    }
  }
</style>
