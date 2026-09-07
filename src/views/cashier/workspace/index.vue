<template>
  <section class="cashier-workspace">
    <DirectCashier v-if="selected" :key="selected" />
    <main v-else class="store-selection-page">
      <section class="store-selection-card">
        <div class="selection-main">
          <div class="selection-copy">
            <span class="selection-kicker">CASHIER WORKSPACE</span>
            <h1>请选择本次<br />收银门店</h1>
            <p>进入门店后，可快速创建订单并完成收款</p>
            <ElButton
              class="select-store-button"
              type="primary"
              size="large"
              @click="openStoreDialog"
            >
              <span>选择门店</span>
              <Icon icon="ri:arrow-right-line" />
            </ElButton>
          </div>

          <div class="selection-visual" aria-hidden="true">
            <span class="selection-visual__halo"></span>
            <img :src="storeSelectionTerminal" alt="" />
          </div>
        </div>

        <div class="selection-features">
          <div class="feature-item">
            <span class="feature-icon"><Icon icon="ri:table-fill" /></span>
            <span class="feature-copy">
              <strong>桌台状态</strong>
              <small>实时查看桌台情况</small>
            </span>
          </div>
          <div class="feature-item">
            <span class="feature-icon"><Icon icon="ri:clipboard-fill" /></span>
            <span class="feature-copy">
              <strong>快速点单</strong>
              <small>高效创建顾客订单</small>
            </span>
          </div>
          <div class="feature-item">
            <span class="feature-icon"><Icon icon="ri:money-cny-circle-fill" /></span>
            <span class="feature-copy">
              <strong>便捷收款</strong>
              <small>支持多种支付方式</small>
            </span>
          </div>
        </div>
      </section>
    </main>

    <ElDialog v-model="storeDialogVisible" title="切换收银门店" width="440px" align-center>
      <div class="store-dialog-content">
        <p>切换门店会清空当前未结算购物车，请先完成收款或挂单后再切换。</p>
        <ElSelect
          v-model="pendingStoreId"
          filterable
          placeholder="请选择收银门店"
          size="large"
          style="width: 100%"
        >
          <ElOption
            v-for="store in stores"
            :key="store.id"
            :label="store.storeName"
            :value="store.id"
          />
        </ElSelect>
      </div>
      <template #footer>
        <ElButton @click="storeDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :disabled="!pendingStoreId" @click="confirmStoreChange">
          确认切换
        </ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { computed, onMounted, provide, ref } from 'vue'
  import { Icon } from '@iconify/vue'
  import { useUserStore } from '@/store/modules/user'
  import { fetchGetStoreList } from '@/api/dish-manage'
  import storeSelectionTerminal from '@/assets/images/cashier/store-selection-terminal.png'
  import DirectCashier from '../directCashier/index.vue'

  const session = useUserStore()
  const stores = ref<Api.Store.StoreListItem[]>([])
  const storeDialogVisible = ref(false)
  const pendingStoreId = ref<number>()
  const selected = computed({
    get: () => session.cashierStoreId,
    set: (value) => {
      session.cashierStoreId = value
    }
  })

  const currentStoreName = computed(
    () => stores.value.find((store) => store.id === selected.value)?.storeName || '选择门店'
  )

  function openStoreDialog() {
    pendingStoreId.value = selected.value
    storeDialogVisible.value = true
  }

  function confirmStoreChange() {
    if (!pendingStoreId.value) return
    selected.value = pendingStoreId.value
    storeDialogVisible.value = false
  }

  provide('cashierStoreSwitcher', {
    currentStoreName,
    openStoreDialog
  })

  onMounted(async () => {
    try {
      const page = await fetchGetStoreList()
      stores.value = page.records
      if (!stores.value.some((store) => store.id === selected.value)) selected.value = undefined
    } catch {
      // 门店列表加载失败时保留选择页，由用户稍后重试。
    }
  })
</script>

<style scoped lang="scss">
  .cashier-workspace {
    height: 100%;
    min-height: 0;
  }

  .store-selection-page {
    display: grid;
    place-items: center;
    height: var(--art-full-height, calc(100vh - 118px));
    min-height: 0;
    padding: 18px;
    overflow: hidden;
    background:
      radial-gradient(circle at 15% 16%, rgb(111 157 255 / 16%), transparent 28%),
      radial-gradient(circle at 86% 78%, rgb(146 181 255 / 13%), transparent 26%),
      linear-gradient(145deg, #f4f8ff 0%, #eef5ff 48%, #f8faff 100%);
    border-radius: 25px;
  }

  .store-selection-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    width: min(880px, 100%);
    max-height: 100%;
    padding: 26px 42px 24px;
    overflow: hidden;
    background:
      linear-gradient(145deg, rgb(255 255 255 / 98%), rgb(253 254 255 / 94%)), var(--el-bg-color);
    border: 1px solid rgb(255 255 255 / 90%);
    border-radius: 30px;
    box-shadow:
      0 18px 46px rgb(48 91 165 / 11%),
      inset 0 1px 0 rgb(255 255 255 / 95%);
  }

  .selection-main {
    display: grid;
    grid-template-columns: minmax(280px, 0.82fr) minmax(380px, 1.18fr);
    gap: 30px;
    align-items: center;
    width: 100%;
    min-height: 330px;
  }

  .selection-visual {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: clamp(270px, 38vh, 350px);

    &__halo {
      position: absolute;
      width: min(60%, 330px);
      aspect-ratio: 1;
      background: linear-gradient(145deg, rgb(225 236 255 / 84%), rgb(242 247 255 / 26%));
      border-radius: 50%;
    }

    img {
      position: relative;
      z-index: 1;
      width: 50%;
      height: 100%;
      pointer-events: none;
      object-fit: contain;
      filter: drop-shadow(0 12px 14px rgb(37 70 126 / 9%));
    }
  }

  .selection-copy {
    position: relative;
    z-index: 1;
    padding-left: 18px;
    text-align: left;

    h1,
    p {
      margin: 0;
    }

    .selection-kicker {
      display: inline-flex;
      padding: 5px 9px;
      margin-bottom: 14px;
      font-size: 10px;
      font-weight: 700;
      color: #3978f4;
      letter-spacing: 1.2px;
      background: #eef5ff;
      border-radius: 6px;
    }

    h1 {
      font-size: clamp(32px, 3vw, 42px);
      font-weight: 800;
      line-height: 1.25;
      color: #17233a;
      letter-spacing: -1.5px;
    }

    p {
      margin-top: 12px;
      font-size: 14px;
      color: #8997ad;
    }
  }

  .select-store-button {
    width: 210px;
    height: 48px;
    margin-top: 24px;
    font-size: 15px;
    font-weight: 700;
    background: linear-gradient(135deg, #3378ff, #4f6ff3);
    border: 0;
    border-radius: 11px;
    box-shadow: 0 10px 20px rgb(52 113 247 / 22%);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;

    :deep(span) {
      display: inline-flex;
      gap: 14px;
      align-items: center;
    }

    svg {
      font-size: 20px;
    }

    &:hover {
      box-shadow: 0 13px 25px rgb(52 113 247 / 28%);
      transform: translateY(-2px);
    }
  }

  .selection-features {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    width: 100%;
    padding: 17px 8px 0;
    margin-top: 4px;
    border-top: 1px solid #edf1f7;
  }

  .feature-item {
    display: flex;
    gap: 11px;
    align-items: center;
    min-width: 0;
    padding: 0 24px;

    & + & {
      border-left: 1px solid #edf1f7;
    }
  }

  .feature-icon {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 44px;
    height: 44px;
    font-size: 21px;
    color: #3978f4;
    background: linear-gradient(145deg, #eff5ff, #f8faff);
    border: 1px solid rgb(109 154 246 / 8%);
    border-radius: 13px;
    box-shadow: 0 6px 14px rgb(64 112 193 / 7%);
  }

  .feature-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    strong {
      font-size: 14px;
      color: #40506c;
      white-space: nowrap;
    }

    small {
      overflow: hidden;
      font-size: 12px;
      color: #9aa6b8;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .store-dialog-content p {
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
  }

  @media (height <= 680px) and (width > 600px) {
    .store-selection-card {
      padding-block: 16px;
    }

    .selection-main {
      min-height: 250px;
    }

    .selection-visual {
      height: 250px;
    }

    .selection-features {
      padding-top: 12px;
    }

    .selection-copy h1 {
      font-size: 32px;
    }
  }

  @media (width <= 820px) and (width > 600px) {
    .store-selection-card {
      padding-inline: 28px;
    }

    .selection-main {
      grid-template-columns: minmax(240px, 0.9fr) minmax(300px, 1.1fr);
      gap: 12px;
    }

    .feature-item {
      padding-inline: 12px;
    }
  }

  @media (width <= 600px) {
    .store-selection-page {
      height: auto;
      min-height: var(--art-full-height, calc(100vh - 96px));
      padding: 8px;
      overflow: auto;
    }

    .store-selection-card {
      padding: 18px 16px 22px;
      border-radius: 22px;
    }

    .selection-main {
      display: flex;
      flex-direction: column-reverse;
      gap: 4px;
      min-height: 0;
    }

    .selection-visual {
      width: min(310px, 82vw);
      height: 180px;
    }

    .selection-copy {
      padding-left: 0;
      text-align: center;

      .selection-kicker {
        display: none;
      }

      h1 {
        font-size: 27px;

        br {
          display: none;
        }
      }

      p {
        margin-top: 7px;
        font-size: 12px;
      }
    }

    .select-store-button {
      width: min(240px, 76vw);
      height: 44px;
      margin-top: 14px;
    }

    .selection-features {
      grid-template-columns: 1fr;
      gap: 10px;
      width: min(280px, 100%);
      padding-top: 14px;
      margin-top: 22px;
    }

    .feature-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
    }

    .feature-item {
      padding-inline: 8px;

      & + & {
        border-left: 0;
      }
    }
  }
</style>
