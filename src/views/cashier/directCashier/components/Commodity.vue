<template>
  <div class="commodity-container">
    <!-- 搜索栏 -->
    <CommoditySearch @search="handleSearch" />

    <!-- 分类标签 -->
    <CommodityClassify @change="handleCategoryChange" />

    <!-- 商品列表 -->
    <CommodityList ref="commodityListRef" :category-id="categoryId" :keyword="keyword" />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import CommoditySearch from './CommoditySearch.vue'
  import CommodityClassify from './CommodityClassify.vue'
  import CommodityList from './CommodityList.vue'

  // 当前分类ID
  const categoryId = ref(0)

  // 搜索关键词
  const keyword = ref('')

  // 商品列表引用
  const commodityListRef = ref()

  // 分类变化
  const handleCategoryChange = (id: number) => {
    categoryId.value = id
  }

  // 搜索
  const handleSearch = (value: string) => {
    keyword.value = value
  }

  // 刷新商品列表
  const refreshCommodityList = () => {
    commodityListRef.value?.refresh()
  }

  // 暴露刷新方法
  defineExpose({
    refreshCommodityList
  })
</script>

<style scoped lang="scss">
  .commodity-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
  }
</style>
