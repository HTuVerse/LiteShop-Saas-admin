<template>
  <div class="commodity-list-container">
    <ElCard shadow="never" class="list-card" v-loading="loading">
      <ElScrollbar>
        <div class="commodity-grid">
          <div v-for="item in filteredList" :key="item.id" class="commodity-item-wrapper">
            <div
              class="commodity-item"
              :class="{
                'sold-out':
                  item.stock === 0 || item.saleStatus === 0 || getCartCount(item.id) >= item.stock
              }"
              @click="handleClick(item)"
            >
              <div
                class="sold-out-mask"
                v-if="
                  item.stock === 0 || item.saleStatus === 0 || getCartCount(item.id) >= item.stock
                "
              >
                {{ item.saleStatus === 0 ? '下架' : '售完' }}
              </div>
              <div class="item-image">
                <ElImage :src="item.dishImage" fit="cover">
                  <template #error>
                    <div class="image-placeholder">
                      <ElIcon :size="32"><Picture /></ElIcon>
                    </div>
                  </template>
                </ElImage>
              </div>
              <div class="item-info">
                <div class="item-name">{{ item.dishName }}</div>
                <div v-if="item.dishDesc" class="item-desc">{{ item.dishDesc }}</div>
                <div class="item-price-wrap">
                  <span class="item-price">￥{{ formatMoney(item.price) }}</span>
                  <span v-if="item.hasActivityPrice" class="item-original-price"
                    >￥{{ formatMoney(item.originalPrice) }}</span
                  >
                  <span class="add-button"
                    ><ElIcon><Plus /></ElIcon
                  ></span>
                </div>
              </div>
            </div>
            <div v-if="getCartCount(item.id) > 0" class="cart-badge">
              {{ getCartCount(item.id) }}
            </div>
          </div>
        </div>

        <ElEmpty v-if="!loading && filteredList.length === 0" description="暂无商品" />
      </ElScrollbar>
    </ElCard>

    <!-- SKU 选择弹窗 -->
    <CommoditySku :visible="skuVisible" :commodity="currentCommodity" @close="skuVisible = false" />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, inject, watch, onMounted } from 'vue'
  import { ElCard, ElScrollbar, ElImage, ElIcon, ElEmpty, ElMessage } from 'element-plus'
  import { Picture, Plus } from '@element-plus/icons-vue'
  import CommoditySku from './CommoditySku.vue'
  import { fetchDishList } from '@/api/cashier'
  import { formatMoney, normalizeDishItem } from '@utils/cashier/utils'

  // 定义 props
  const props = defineProps<{
    categoryId: number
    keyword: string
  }>()

  // 注入购物车数据
  const { cart, updateCart } = inject<any>('cart')

  // SKU 弹窗状态
  const skuVisible = ref(false)

  // 当前选中的商品
  const currentCommodity = ref<any>(null)

  // 加载状态
  const loading = ref(false)

  // 商品列表（原始数据）
  const dishList = ref<any[]>([])

  // 过滤后的商品列表
  const filteredList = computed(() => {
    let result = dishList.value

    // 按分类筛选
    if (props.categoryId !== 0) {
      result = result.filter((item) => item.categoryId === props.categoryId)
    }

    // 按关键词筛选
    if (props.keyword) {
      const lowerKeyword = props.keyword.toLowerCase()
      result = result.filter(
        (item) =>
          item.dishName?.toLowerCase().includes(lowerKeyword) ||
          item.dishDesc?.toLowerCase().includes(lowerKeyword)
      )
    }

    return result
  })

  const cashierStoreId = inject<import('vue').Ref<number | undefined>>('cashierStoreId')
  // 加载菜品数据
  const loadDishList = async () => {
    loading.value = true
    try {
      // 使用不分页接口获取所有菜品
      const res = await fetchDishList('', 0, cashierStoreId?.value)

      // 处理返回数据
      const dishes = res

      // 统一格式化
      dishList.value = dishes.map(normalizeDishItem)
    } catch (error: any) {
      console.error('加载菜品失败:', error)
      ElMessage.error('加载菜品失败')
      dishList.value = []
    } finally {
      loading.value = false
    }
  }

  // 获取购物车中商品数量
  const getCartCount = (id: number): number => {
    let count = 0
    cart.commodity.forEach((item: any) => {
      if (item.id === id) {
        count += item.number
      }
    })
    return count
  }

  // 点击商品
  const handleClick = (item: any) => {
    // 检查状态
    if (item.saleStatus === 0) {
      ElMessage.warning('该商品已下架')
      return
    }

    // 检查库存
    const cartCount = getCartCount(item.id)
    if (item.stock === 0 || cartCount >= item.stock) {
      ElMessage.warning('该商品已售完')
      return
    }

    // 如果有规格，打开 SKU 弹窗
    if (item.hasSpec && item.specOptions && item.specOptions.length > 0) {
      currentCommodity.value = JSON.parse(JSON.stringify(item))
      skuVisible.value = true
    } else {
      // 没有规格，直接加入购物车
      updateCart({
        ...item,
        number: 1,
        isGift: 0 // 默认不是赠菜
      })
    }
  }

  // 监听关键词变化，自动加购
  watch(
    () => props.keyword,
    (keyword) => {
      if (keyword && filteredList.value.length === 1) {
        const item = filteredList.value[0]
        if (
          !item.hasSpec &&
          item.stock > 0 &&
          item.saleStatus !== 0 &&
          getCartCount(item.id) < item.stock
        ) {
          updateCart({
            ...item,
            number: 1,
            isGift: 0 // 默认不是赠菜
          })
        }
      }
    }
  )

  // 初始化
  onMounted(() => {
    loadDishList()
  })

  // 暴露刷新方法
  defineExpose({
    refresh: loadDishList
  })
</script>

<style scoped lang="scss">
  .commodity-list-container {
    flex: 1;
    min-height: 0;
    overflow: hidden;

    .list-card {
      height: 100%;
      border: 0;
      border-radius: 12px;

      :deep(.el-card__body) {
        height: 100%;
        padding: 8px 7px 8px 8px;
      }
    }
  }

  .commodity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
    padding: 3px;
  }

  .commodity-item-wrapper {
    position: relative;
  }

  .commodity-item {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
    cursor: pointer;
    background-color: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    box-shadow: 0 4px 12px rgb(31 71 137 / 6%);
    transition: all 0.2s;

    &:hover {
      color: inherit;
      border-color: var(--el-color-primary-light-7);
      box-shadow: 0 10px 24px rgb(31 110 246 / 14%);
      transform: translateY(-2px);

      .item-info .item-price {
        color: var(--el-color-danger);
      }

      .item-info .item-original-price {
        color: var(--el-text-color-placeholder);
      }
    }

    &.sold-out {
      cursor: not-allowed;
      opacity: 0.7;

      .add-button {
        background: var(--el-text-color-placeholder);
        box-shadow: none;
      }

      &:hover {
        color: inherit;
        background-color: var(--el-bg-color);

        .item-info .item-price {
          color: var(--el-color-danger);
        }

        .item-info .item-original-price {
          color: var(--el-text-color-placeholder);
        }
      }
    }

    .sold-out-mask {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 24px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      background-color: rgb(0 0 0 / 70%);
      border-radius: 14px;
    }

    .item-image {
      flex-shrink: 0;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      border-radius: 9px 9px 0 0;

      .el-image {
        width: 100%;
        height: 100%;
      }

      .image-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--el-text-color-placeholder);
        background-color: var(--el-fill-color);
      }
    }

    .item-info {
      display: flex;
      flex: 1;
      flex-direction: column;
      justify-content: flex-start;
      min-width: 0;
      min-height: 70px;
      padding: 8px 9px 9px;

      .item-name {
        display: -webkit-box;
        height: auto;
        overflow: hidden;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.35;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
      }

      .item-desc {
        margin-top: 2px;
        overflow: hidden;
        font-size: 11px;
        color: var(--el-text-color-secondary);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .item-price-wrap {
        display: flex;
        position: relative;
        gap: 5px;
        align-items: baseline;
        margin-top: auto;
        padding-top: 6px;
      }

      .item-price {
        order: 0;
        font-size: 15px;
        font-weight: 600;
        color: var(--el-color-danger);
      }

      .item-original-price {
        order: 1;
        font-size: 11px;
        color: var(--el-text-color-placeholder);
        text-decoration: line-through;
      }

      .add-button {
        display: grid;
        width: 26px;
        height: 26px;
        margin-left: auto;
        font-size: 16px;
        color: #fff;
        background: var(--el-color-primary);
        border-radius: 50%;
        box-shadow: 0 5px 12px var(--el-color-primary-light-6);
        place-items: center;
      }
    }
  }

  .cart-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background-color: var(--el-color-danger);
    border-radius: 10px;
    box-shadow: 0 2px 4px rgb(0 0 0 / 20%);
  }
</style>
