<template>
  <ElDrawer
    :model-value="visible"
    title="挂单列表"
    direction="ltr"
    size="380px"
    @close="handleClose"
  >
    <div class="pending-list">
      <div v-if="pending.length > 0" class="list-content">
        <div v-for="(item, index) in pending" :key="item.uuid" class="pending-item">
          <div class="item-left">
            <ElAvatar v-if="item.member" :size="48" :src="item.member.portrait">
              {{ item.member.nickname?.charAt(0) }}
            </ElAvatar>
            <ElAvatar v-else :size="48" :icon="User" />
          </div>

          <div class="item-info">
            <div class="info-top">
              <span class="nickname">{{ item.member?.nickname || '游客' }}</span>
              <ElButton
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click.stop="handleDelete(index)"
              />
            </div>

            <div class="info-middle">
              <span class="phone">手机号：{{ item.member?.cellphone || '-' }}</span>
              <ElButton type="primary" size="small" round @click="handleExtract(item, index)">
                提取
              </ElButton>
            </div>

            <div class="info-bottom">
              <span class="time">{{ item.time }}</span>
              <span class="total">
                合计：<span class="price">￥{{ formatMoney(item.total) }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <ElEmpty v-else description="暂无挂单" />
    </div>

    <!-- 清空确认弹窗 -->
    <ElDialog v-model="clearVisible" title="提示" width="400px" align-center :append-to-body="true">
      <div>确定要清空所有挂单吗？</div>
      <div style=" margin-top: 8px;color: var(--el-color-warning)">
        清空所有挂单后将无法恢复，请谨慎操作！
      </div>
      <template #footer>
        <ElButton @click="clearVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleClearAll">确定</ElButton>
      </template>
    </ElDialog>

    <template #footer>
      <ElButton v-if="pending.length > 0" type="danger" @click="clearVisible = true">
        清空所有挂单
      </ElButton>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { ref, inject } from 'vue'
  import { ElDrawer, ElAvatar, ElButton, ElEmpty, ElDialog } from 'element-plus'
  import { User, Delete } from '@element-plus/icons-vue'
  import { formatMoney } from '@utils/cashier/utils'

  // Props
  defineProps<{
    visible: boolean
  }>()

  // Emits
  const emit = defineEmits(['close'])

  // 注入数据
  const { pending, deletePending, emptyPending } = inject<any>('pending')
  const { pendingToCart } = inject<any>('cart')

  // 清空确认弹窗
  const clearVisible = ref(false)

  // 关闭
  const handleClose = () => {
    emit('close')
  }

  // 提取挂单
  const handleExtract = (item: any, index: number) => {
    pendingToCart(item)
    deletePending(index)
    handleClose()
  }

  // 删除挂单
  const handleDelete = (index: number) => {
    deletePending(index)
  }

  // 清空所有挂单
  const handleClearAll = () => {
    emptyPending()
    clearVisible.value = false
  }
</script>

<style scoped lang="scss">
  .pending-list {
    height: 100%;
  }

  .list-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pending-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    background-color: var(--el-fill-color-lighter);
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    .item-left {
      flex-shrink: 0;
    }

    .item-info {
      flex: 1;
      min-width: 0;

      .info-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .nickname {
          overflow: hidden;
          font-size: 15px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .info-middle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .phone {
          font-size: 13px;
          color: var(--el-text-color-secondary);
        }
      }

      .info-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: var(--el-text-color-secondary);

        .total {
          .price {
            font-weight: 600;
            color: var(--el-color-danger);
          }
        }
      }
    }
  }
</style>
