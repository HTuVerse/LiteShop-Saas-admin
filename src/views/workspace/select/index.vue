<template>
  <main class="workspace-page">
    <div class="background-orb background-orb--left" aria-hidden="true"></div>
    <div class="background-orb background-orb--right" aria-hidden="true"></div>

    <section class="workspace-shell">
      <header class="workspace-hero">
        <ElButton class="back-button" circle plain aria-label="返回系统" @click="back">
          <ArtSvgIcon icon="ri:arrow-left-line" />
        </ElButton>

        <div class="hero-copy">
          <span class="eyebrow">
            <ArtSvgIcon icon="ri:restaurant-2-line" />
            LITESHOP 工作空间
          </span>
          <h1>{{ pageTitle }}</h1>
          <p>{{ pageDescription }}</p>
        </div>

        <img class="hero-illustration" :src="workspaceHero" alt="餐饮门店插画" />
      </header>

      <ElAlert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        show-icon
        class="notice"
      />

      <section class="workspace-toolbar" aria-label="工作空间筛选">
        <ElInput
          v-model="keyword"
          class="workspace-search"
          clearable
          size="large"
          placeholder="搜索租户名称、编码或门店名称"
        >
          <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
        </ElInput>

        <div class="toolbar-tail">
          <ElSelect v-model="sortMode" class="sort-select" size="large">
            <ElOption label="当前优先" value="recommended" />
            <ElOption label="名称排序" value="name" />
          </ElSelect>
          <div class="view-switch" aria-label="展示方式">
            <button
              type="button"
              :class="{ active: viewMode === 'grid' }"
              aria-label="网格展示"
              @click="viewMode = 'grid'"
            >
              <ArtSvgIcon icon="ri:grid-fill" />
            </button>
            <button
              type="button"
              :class="{ active: viewMode === 'list' }"
              aria-label="列表展示"
              @click="viewMode = 'list'"
            >
              <ArtSvgIcon icon="ri:list-check" />
            </button>
          </div>
        </div>
      </section>

      <div class="result-heading">
        <div>
          <strong>{{ resultTitle }}</strong>
          <span>共 {{ filteredCards.length }} 个可用入口</span>
        </div>
        <span class="scope-tip">
          <ArtSvgIcon icon="ri:shield-check-line" />
          已按账号权限过滤
        </span>
      </div>

      <section v-if="loading" class="workspace-grid" aria-label="正在加载工作空间">
        <ElSkeleton v-for="item in 8" :key="item" animated class="workspace-skeleton">
          <template #template>
            <ElSkeletonItem variant="image" class="skeleton-cover" />
            <div class="skeleton-copy">
              <ElSkeletonItem variant="h3" style="width: 58%" />
              <ElSkeletonItem variant="text" style="width: 36%" />
              <ElSkeletonItem variant="text" style="width: 76%" />
            </div>
          </template>
        </ElSkeleton>
      </section>

      <template v-else-if="filteredCards.length">
        <section
          class="workspace-grid"
          :class="{ 'workspace-grid--list': viewMode === 'list' }"
          aria-live="polite"
        >
          <button
            v-for="(item, index) in pagedCards"
            :key="item.key"
            type="button"
            class="workspace-card"
            :class="[
              `workspace-card--${item.level}`,
              `workspace-card--visual-${index % 6}`,
              { current: item.current }
            ]"
            :disabled="busy || item.disabled"
            @click="selectCard(item)"
          >
            <span class="card-cover" aria-hidden="true">
              <span class="level-badge">{{ item.levelLabel }}</span>
              <span class="card-symbol">
                <ArtSvgIcon :icon="item.icon" />
              </span>
              <span v-if="item.current" class="current-check">
                <ArtSvgIcon icon="ri:check-line" />
              </span>
            </span>

            <span class="card-content">
              <span class="card-title-row">
                <strong :title="item.title">{{ item.title }}</strong>
                <ArtSvgIcon class="enter-arrow" icon="ri:arrow-right-up-line" />
              </span>
              <span class="card-status-row">
                <span class="available-badge">
                  <i></i>
                  {{ item.current ? '当前空间' : '可进入' }}
                </span>
                <span v-if="item.defaultStore" class="default-badge">默认门店</span>
              </span>
              <span class="card-meta" :title="item.meta">
                <ArtSvgIcon
                  :icon="item.level === 'store' ? 'ri:map-pin-2-line' : 'ri:building-line'"
                />
                {{ item.meta }}
              </span>
              <span class="card-role">
                <ArtSvgIcon icon="ri:user-star-line" />
                {{ item.role }}
              </span>
            </span>
          </button>
        </section>

        <ElPagination
          v-if="filteredCards.length > pageSize"
          v-model:current-page="page"
          class="workspace-pagination"
          background
          layout="prev, pager, next"
          :page-size="pageSize"
          :total="filteredCards.length"
        />
      </template>

      <ElEmpty
        v-else
        :description="allCards.length ? '没有匹配的工作空间' : '暂无可用工作空间'"
        class="workspace-empty"
      >
        <ElButton v-if="keyword" type="primary" plain @click="resetFilters"> 清空筛选 </ElButton>
      </ElEmpty>
    </section>
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { fetchAdminWorkspaces, normalizeUser, switchAdminWorkspace } from '@/api/auth'
  import { enterTenant, exitTenant, listTenants } from '@/api/tenant'
  import { useUserStore } from '@/store/modules/user'
  import type { BackendUser, StoreOption, Tenant, WorkspaceOption } from '@/types/backend'
  import workspaceHero from '@/assets/images/workspace/workspace-hero.png'

  defineOptions({ name: 'WorkspaceSelect' })

  type WorkspaceLevel = 'platform' | 'tenant' | 'store'
  type SortMode = 'recommended' | 'name'
  type ViewMode = 'grid' | 'list'

  interface WorkspaceCard {
    key: string
    title: string
    meta: string
    role: string
    icon: string
    level: WorkspaceLevel
    levelLabel: string
    current: boolean
    disabled: boolean
    defaultStore: boolean
    tenant?: WorkspaceOption
    platformTenant?: Tenant
    store?: StoreOption
  }

  const router = useRouter()
  const session = useUserStore()
  const workspaces = ref<WorkspaceOption[]>([])
  const platformTenants = ref<Tenant[]>([])
  const loading = ref(false)
  const busy = ref(false)
  const error = ref('')
  const keyword = ref('')
  const sortMode = ref<SortMode>('recommended')
  const viewMode = ref<ViewMode>('grid')

  const isTenantAdmin = (roles: string[]) => roles.includes('ADMIN')
  const roleLabel = (roles: string[]) => {
    if (roles.includes('ADMIN')) return '租户管理员'
    if (roles.includes('STORE_ADMIN')) return '店长'
    if (roles.includes('STORE_STAFF')) return '门店员工'
    return '门店账号'
  }
  const isCurrentTenant = (tenantId: Tenant['id']) =>
    String(session.activeTenant?.id || session.info.tenantId) === String(tenantId)
  const isCurrentStore = (tenant: WorkspaceOption, store: StoreOption) =>
    isCurrentTenant(tenant.tenantId) &&
    String(session.activeStore?.storeId || session.info.activeStoreId) === String(store.storeId)

  const allCards = computed<WorkspaceCard[]>(() => {
    if (session.isSuperAdmin) {
      return [
        {
          key: 'platform',
          title: '平台管理中心',
          meta: 'LITESHOP PLATFORM',
          role: '超级管理员',
          icon: 'ri:shield-star-line',
          level: 'platform',
          levelLabel: '平台级',
          current: !session.activeTenant,
          disabled: false,
          defaultStore: false
        },
        ...platformTenants.value.map<WorkspaceCard>((tenant) => ({
          key: `platform-tenant-${tenant.id}`,
          title: tenant.tenantName,
          meta: `${tenant.tenantCode} · 全部门店`,
          role: '超级管理员 · 租户视角',
          icon: 'ri:building-2-line',
          level: 'tenant',
          levelLabel: '租户级',
          current: String(session.activeTenant?.id) === String(tenant.id),
          disabled: tenant.status !== 1,
          defaultStore: false,
          platformTenant: tenant
        }))
      ]
    }

    return workspaces.value.flatMap<WorkspaceCard>((tenant) => {
      if (isTenantAdmin(tenant.roleCodes)) {
        return [
          {
            key: `tenant-${tenant.tenantId}`,
            title: tenant.tenantName,
            meta: `${tenant.tenantCode} · 全部门店`,
            role: roleLabel(tenant.roleCodes),
            icon: 'ri:building-2-line',
            level: 'tenant',
            levelLabel: '租户级',
            current: isCurrentTenant(tenant.tenantId) && !session.activeStore,
            disabled: false,
            defaultStore: false,
            tenant
          }
        ]
      }

      return tenant.stores.map<WorkspaceCard>((store) => ({
        key: `store-${tenant.tenantId}-${store.storeId}`,
        title: store.storeName,
        meta: `${tenant.tenantName} · ${tenant.tenantCode}`,
        role: roleLabel(tenant.roleCodes),
        icon: 'ri:store-2-line',
        level: 'store',
        levelLabel: '门店级',
        current: isCurrentStore(tenant, store),
        disabled: false,
        defaultStore: store.defaultStore,
        tenant,
        store
      }))
    })
  })
  const pageSize = 8
  const page = ref(1)
  const filteredCards = computed(() => {
    const query = keyword.value.trim().toLocaleLowerCase()
    const cards = allCards.value.filter((item) => {
      const matchesKeyword =
        !query || `${item.title} ${item.meta} ${item.role}`.toLocaleLowerCase().includes(query)
      return matchesKeyword
    })
    return [...cards].sort((left, right) => {
      if (sortMode.value === 'recommended') {
        if (left.current !== right.current) return left.current ? -1 : 1
        if (left.defaultStore !== right.defaultStore) return left.defaultStore ? -1 : 1
      }
      return left.title.localeCompare(right.title, 'zh-CN')
    })
  })
  const pagedCards = computed(() => {
    const start = (page.value - 1) * pageSize
    return filteredCards.value.slice(start, start + pageSize)
  })

  watch([keyword, sortMode, viewMode], () => {
    page.value = 1
  })
  watch(
    () => filteredCards.value.length,
    (total) => {
      page.value = Math.min(page.value, Math.max(1, Math.ceil(total / pageSize)))
    }
  )

  const onlyStoreLevel = computed(
    () => allCards.value.length > 0 && allCards.value.every((item) => item.level === 'store')
  )
  const pageTitle = computed(() => (onlyStoreLevel.value ? '选择您的门店' : '选择工作空间'))
  const pageDescription = computed(() =>
    onlyStoreLevel.value
      ? '切换不同门店，聚焦当前经营范围，让每一份美味都被看见'
      : '选择本次管理范围，租户级统一管理，门店级专注经营'
  )
  const resultTitle = computed(() => (onlyStoreLevel.value ? '授权门店' : '可用工作空间'))

  async function load() {
    loading.value = true
    error.value = ''
    try {
      if (session.isSuperAdmin) {
        const page = await listTenants({ currentPage: 1, pageSize: 200, status: 1 })
        platformTenants.value = page.records
      } else {
        workspaces.value = await fetchAdminWorkspaces()
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '工作空间加载失败'
    } finally {
      loading.value = false
    }
  }

  async function applyUser(user: BackendUser, tenant: WorkspaceOption, store?: StoreOption) {
    const previousUserId = session.info.userId
    session.clearBusinessState()
    if (user.token) session.setToken(user.token)
    session.setUserInfo(normalizeUser(user))
    session.activeTenant = {
      id: tenant.tenantId,
      tenantName: tenant.tenantName,
      tenantCode: tenant.tenantCode,
      status: 1
    }
    session.activeStore = store || null
    localStorage.setItem(
      'liteshop-scope-change',
      JSON.stringify({ at: Date.now(), userId: previousUserId })
    )
    ElMessage.success(store ? `已切换到 ${store.storeName}` : `已进入 ${tenant.tenantName}`)
    await router.replace('/dashboard/console')
  }

  async function switchWorkspace(tenant: WorkspaceOption, store?: StoreOption) {
    const user = await switchAdminWorkspace(tenant.tenantId, store?.storeId)
    await applyUser(user, tenant, store)
  }

  async function enterPlatformTenant(tenant: Tenant) {
    const active = await enterTenant(tenant.id)
    session.setActiveTenant(active)
    localStorage.setItem(
      'liteshop-scope-change',
      JSON.stringify({ at: Date.now(), userId: session.info.userId })
    )
    await router.replace('/dashboard/console')
  }

  async function leavePlatformTenant() {
    if (session.activeTenant) {
      await exitTenant()
      session.setActiveTenant(null)
    }
    await router.replace('/dashboard/console')
  }

  async function selectCard(item: WorkspaceCard) {
    if (busy.value || item.disabled || item.current) return
    busy.value = true
    try {
      if (item.level === 'platform') await leavePlatformTenant()
      else if (item.platformTenant) await enterPlatformTenant(item.platformTenant)
      else if (item.tenant) await switchWorkspace(item.tenant, item.store)
    } finally {
      busy.value = false
    }
  }

  function resetFilters() {
    keyword.value = ''
  }

  const back = () => router.back()
  onMounted(load)
</script>

<style scoped lang="scss">
  .workspace-page {
    position: relative;
    box-sizing: border-box;
    height: 100dvh;
    min-height: 0;
    padding: clamp(10px, 1.5vw, 20px) clamp(14px, 3vw, 42px) 12px;
    overflow: hidden;
    color: #0d1f45;
    background:
      radial-gradient(circle at 8% 5%, rgb(214 232 255 / 85%), transparent 27%),
      radial-gradient(circle at 94% 20%, rgb(198 222 255 / 70%), transparent 34%),
      linear-gradient(145deg, #f8fbff 0%, #edf5ff 48%, #f8fbff 100%);
  }

  .background-orb {
    position: absolute;
    pointer-events: none;
    filter: blur(12px);
    border-radius: 50%;

    &--left {
      bottom: -210px;
      left: -120px;
      width: 520px;
      height: 520px;
      background: rgb(215 233 255 / 42%);
    }

    &--right {
      top: 220px;
      right: -260px;
      width: 620px;
      height: 620px;
      background: rgb(206 227 255 / 38%);
    }
  }

  .workspace-shell {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: min(1440px, 100%);
    height: 100%;
    margin: 0 auto;
  }

  .workspace-hero {
    position: relative;
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    min-height: clamp(96px, 12vw, 132px);
  }

  .hero-copy {
    position: relative;
    z-index: 2;
    max-width: 610px;
    padding-left: 2px;

    h1 {
      margin: 8px 0 4px;
      font-size: clamp(28px, 2.7vw, 42px);
      font-weight: 760;
      line-height: 1.12;
      letter-spacing: -2px;
    }

    p {
      margin: 0;
      font-size: clamp(13px, 1.1vw, 16px);
      line-height: 1.45;
      color: #60759f;
    }
  }

  .eyebrow {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 700;
    color: #146ef5;
    letter-spacing: 1.5px;
    background: rgb(255 255 255 / 72%);
    backdrop-filter: blur(8px);
    border: 1px solid rgb(173 205 250 / 55%);
    border-radius: 999px;
    box-shadow: 0 8px 24px rgb(45 111 204 / 8%);
  }

  .hero-illustration {
    position: absolute;
    right: -1.5%;
    bottom: -8px;
    width: min(52vw, 720px);
    max-height: 168px;
    pointer-events: none;
    object-fit: contain;
    object-position: right bottom;
    filter: drop-shadow(0 22px 34px rgb(50 103 183 / 10%));
  }

  .back-button {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 3;
    color: #315684;
    background: rgb(255 255 255 / 72%);
    backdrop-filter: blur(10px);
    border-color: rgb(155 189 232 / 52%);
  }

  .notice {
    margin: 0 0 8px;
  }

  .workspace-toolbar {
    position: relative;
    z-index: 3;
    display: grid;
    grid-template-columns: minmax(280px, 1fr) auto;
    gap: 12px;
    align-items: center;
    margin-top: 0;

    :deep(.el-input__wrapper),
    :deep(.el-select__wrapper) {
      min-height: 44px;
      background: rgb(255 255 255 / 90%);
      border: 1px solid rgb(202 219 242 / 72%);
      border-radius: 13px;
      box-shadow: 0 12px 35px rgb(40 83 142 / 8%);
    }

    :deep(.el-input__wrapper.is-focus),
    :deep(.el-select__wrapper.is-focused) {
      border-color: #4090ff;
      box-shadow: 0 0 0 3px rgb(64 144 255 / 12%);
    }
  }

  .workspace-search {
    :deep(.el-input__prefix) {
      margin-right: 8px;
      font-size: 21px;
      color: #7188ad;
    }
  }

  .toolbar-tail {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: flex-end;
  }

  .sort-select {
    width: 145px;

    :deep(.el-select__wrapper) {
      box-shadow: none;
    }
  }

  .view-switch {
    display: flex;
    padding: 4px;
    background: rgb(255 255 255 / 90%);
    border: 1px solid rgb(202 219 242 / 72%);
    border-radius: 12px;
    box-shadow: 0 12px 35px rgb(40 83 142 / 8%);

    button {
      display: grid;
      place-items: center;
      width: 36px;
      height: 34px;
      padding: 0;
      font-size: 19px;
      color: #7890b6;
      cursor: pointer;
      background: transparent;
      border: 0;
      border-radius: 9px;

      &.active {
        color: white;
        background: linear-gradient(145deg, #2081ff, #0867ed);
        box-shadow: 0 8px 18px rgb(20 112 242 / 25%);
      }
    }
  }

  .result-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 12px 2px 8px;

    > div {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    strong {
      font-size: 16px;
    }

    span {
      font-size: 13px;
      color: #7185aa;
    }
  }

  .scope-tip {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }

  .workspace-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;

    &--list {
      grid-template-columns: repeat(2, minmax(0, 1fr));

      .workspace-card {
        display: grid;
        grid-template-columns: 116px minmax(0, 1fr);
      }

      .card-cover {
        min-height: 112px;
        border-radius: 15px 0 0 15px;
      }
    }
  }

  .workspace-card,
  .workspace-skeleton {
    min-width: 0;
    overflow: hidden;
    background: rgb(255 255 255 / 92%);
    border: 1px solid rgb(217 228 244 / 82%);
    border-radius: 16px;
    box-shadow: 0 14px 40px rgb(35 78 139 / 7%);
  }

  .workspace-card {
    position: relative;
    display: block;
    padding: 0;
    color: #0d1f45;
    text-align: left;
    cursor: pointer;
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;

    &:hover:not(:disabled) {
      border-color: #65a4ff;
      box-shadow: 0 20px 45px rgb(26 96 193 / 14%);
      transform: translateY(-4px);

      .enter-arrow {
        color: #1477f8;
        transform: translate(2px, -2px);
      }
    }

    &.current {
      border-color: #1477f8;
      box-shadow:
        0 16px 42px rgb(20 119 248 / 13%),
        inset 0 0 0 1px #1477f8;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.56;
    }

    &--visual-1 .card-cover {
      background-position: 68% 43%;
    }

    &--visual-2 .card-cover {
      background-position: 91% 34%;
    }

    &--visual-3 .card-cover {
      background-position: 51% 57%;
    }

    &--visual-4 .card-cover {
      background-position: 76% 67%;
    }

    &--visual-5 .card-cover {
      background-position: 100% 74%;
    }
  }

  .card-cover {
    position: relative;
    display: block;
    min-height: 78px;
    overflow: hidden;
    background:
      linear-gradient(100deg, rgb(224 239 255 / 18%), rgb(13 75 173 / 14%)),
      url('@/assets/images/workspace/workspace-hero.png') 58% 48% / 200% auto no-repeat,
      linear-gradient(135deg, #d8eaff, #eef6ff);
    border-radius: 15px 15px 0 0;

    &::after {
      position: absolute;
      inset: 0;
      content: '';
      background: linear-gradient(180deg, transparent 48%, rgb(7 33 78 / 17%));
    }
  }

  .level-badge,
  .current-check,
  .card-symbol {
    position: absolute;
    z-index: 1;
  }

  .level-badge {
    top: 8px;
    left: 8px;
    padding: 3px 7px;
    font-size: 11px;
    font-weight: 700;
    color: #185fbf;
    background: rgb(255 255 255 / 88%);
    backdrop-filter: blur(8px);
    border: 1px solid rgb(255 255 255 / 76%);
    border-radius: 999px;
    box-shadow: 0 5px 14px rgb(17 71 143 / 12%);
  }

  .current-check {
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    font-size: 18px;
    color: white;
    background: #1477f8;
    border: 3px solid rgb(255 255 255 / 92%);
    border-radius: 50%;
    box-shadow: 0 7px 16px rgb(12 92 203 / 28%);
  }

  .card-symbol {
    right: 9px;
    bottom: 7px;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    font-size: 22px;
    color: #145fac;
    background: rgb(255 255 255 / 85%);
    backdrop-filter: blur(8px);
    border: 1px solid rgb(255 255 255 / 92%);
    border-radius: 12px;
    box-shadow: 0 7px 20px rgb(8 52 112 / 18%);
  }

  .card-content {
    display: grid;
    gap: 6px;
    padding: 10px 12px 11px;
  }

  .card-title-row,
  .card-status-row,
  .card-meta,
  .card-role {
    display: flex;
    align-items: center;
  }

  .card-title-row {
    gap: 10px;
    justify-content: space-between;

    strong {
      overflow: hidden;
      font-size: 15px;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .enter-arrow {
    flex: 0 0 auto;
    font-size: 18px;
    color: #91a2bd;
    transition: 180ms ease;
  }

  .card-status-row {
    gap: 8px;
  }

  .available-badge,
  .default-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    font-size: 12px;
    border-radius: 999px;
  }

  .available-badge {
    gap: 6px;
    color: #068958;
    background: #e9fbf3;

    i {
      width: 6px;
      height: 6px;
      background: #14b879;
      border-radius: 50%;
    }
  }

  .default-badge {
    color: #1669d8;
    background: #eaf3ff;
  }

  .card-meta,
  .card-role {
    gap: 7px;
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    color: #7386a9;
    text-overflow: ellipsis;
    white-space: nowrap;

    svg {
      flex: 0 0 auto;
      font-size: 15px;
      color: #7897c4;
    }
  }

  .card-role {
    padding-top: 6px;
    border-top: 1px solid #edf2f9;
  }

  .workspace-skeleton {
    :deep(.el-skeleton__item) {
      border-radius: 7px;
    }
  }

  .skeleton-cover {
    display: block;
    width: 100%;
    height: 78px;
    border-radius: 0 !important;
  }

  .skeleton-copy {
    display: grid;
    gap: 8px;
    padding: 12px;
  }

  .workspace-empty {
    padding: 32px 0;
    background: rgb(255 255 255 / 54%);
    border: 1px dashed #bfd4ef;
    border-radius: 18px;
  }

  .workspace-pagination {
    flex: 0 0 auto;
    justify-content: center;
    margin-top: 6px;

    :deep(.el-pager li),
    :deep(.btn-prev),
    :deep(.btn-next) {
      min-width: 26px;
      height: 26px;
      margin: 0 2px;
    }
  }

  @media (width <= 880px) {
    .workspace-page {
      height: auto;
      min-height: 100dvh;
      padding: 20px 18px 40px;
      overflow-x: hidden;
      overflow-y: auto;
    }

    .workspace-shell {
      height: auto;
    }

    .workspace-hero {
      min-height: 190px;
    }

    .hero-copy {
      max-width: 52%;
    }

    .hero-illustration {
      right: -18%;
      width: 76vw;
      opacity: 0.9;
    }

    .workspace-toolbar {
      grid-template-columns: 1fr 1fr;
    }

    .workspace-search,
    .toolbar-tail {
      grid-column: 1 / -1;
    }

    .workspace-grid,
    .workspace-grid--list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .workspace-grid--list .workspace-card {
      display: block;
    }

    .workspace-grid--list .card-cover {
      min-height: 126px;
      border-radius: 15px 15px 0 0;
    }
  }

  @media (width <= 600px) {
    .workspace-page {
      height: auto;
      min-height: 100dvh;
      padding: 18px 14px 36px;
      overflow-x: hidden;
      overflow-y: auto;
    }

    .workspace-hero {
      align-items: flex-start;
      min-height: 235px;
      padding-top: 32px;
    }

    .hero-copy {
      max-width: 100%;

      h1 {
        margin-top: 14px;
        font-size: 34px;
        letter-spacing: -1px;
      }

      p {
        max-width: 80%;
        font-size: 14px;
      }
    }

    .hero-illustration {
      right: -31%;
      bottom: -24px;
      width: 96vw;
      max-height: 190px;
      opacity: 0.52;
    }

    .workspace-toolbar {
      grid-template-columns: 1fr 1fr;
      gap: 10px;

      :deep(.el-input__wrapper),
      :deep(.el-select__wrapper) {
        min-height: 50px;
      }
    }

    .sort-select {
      width: 100%;
    }

    .toolbar-tail {
      align-items: stretch;
    }

    .sort-select {
      flex: 1;
    }

    .view-switch button {
      width: 39px;
      height: 40px;
    }

    .result-heading {
      margin-top: 24px;

      > div {
        display: grid;
        gap: 4px;
      }
    }

    .scope-tip {
      display: none;
    }

    .workspace-grid,
    .workspace-grid--list {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .workspace-grid--list .workspace-card {
      display: grid;
      grid-template-columns: 126px minmax(0, 1fr);
    }

    .workspace-grid--list .card-cover {
      min-height: 100%;
      border-radius: 15px 0 0 15px;
    }

    .workspace-grid--list .card-content {
      gap: 9px;
      padding: 14px;
    }

    .workspace-grid--list .card-role {
      display: none;
    }
  }
</style>
