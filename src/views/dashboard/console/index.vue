<template>
  <section class="workspace-page">
    <header class="welcome-banner">
      <div class="welcome-copy">
        <span class="eyebrow">LITESHOP · 今日工作台</span>
        <h1>{{ greeting }}，{{ displayName }} <span aria-hidden="true">👋</span></h1>
        <p>用清晰的工作范围和快捷入口，开始今天的门店管理。</p>
        <div class="welcome-date"><ArtSvgIcon icon="ri:calendar-line" />{{ date }}</div>
      </div>
      <div class="welcome-slogan">
        <strong>好味道，从这里开始！</strong>
        <span>Together for a tastier tomorrow.</span>
      </div>
      <img :src="workspaceShop" alt="LiteShop 门店插画" />
    </header>

    <ElAlert
      v-if="session.isSuperAdmin && !session.activeTenant"
      class="scope-alert"
      title="当前处于平台视角。请进入商户后管理门店、用户和业务数据。"
      type="info"
      :closable="false"
      show-icon
    />
    <ElAlert
      v-else-if="!session.info.roles?.includes('ADMIN') && !session.isSuperAdmin"
      class="scope-alert"
      :title="`当前工作门店：${storeLabel}。业务数据仅限该门店。`"
      type="info"
      :closable="false"
      show-icon
    />

    <div class="workspace-grid">
      <main class="workspace-main">
        <section class="identity-card panel-card">
          <div class="identity-primary">
            <img class="identity-avatar" :src="userAvatar" alt="用户头像" />
            <div class="identity-copy">
              <div class="identity-name">
                <h2>{{ displayName }}</h2>
                <span>{{ roleLabel }}</span>
              </div>
              <h3>{{ tenantLabel }}</h3>
              <p>{{ session.info.introduction || '欢迎回到 LiteShop 商户运营管理平台。' }}</p>
            </div>
            <ElButton v-if="profilePath" plain round @click="openEntry(profilePath)">
              <ArtSvgIcon icon="ri:edit-line" />编辑资料
            </ElButton>
          </div>
          <div class="identity-stats">
            <article>
              <span><ArtSvgIcon icon="ri:building-2-line" /></span>
              <div
                ><small>当前组织</small><strong>{{ tenantLabel }}</strong></div
              >
            </article>
            <article>
              <span><ArtSvgIcon icon="ri:store-2-line" /></span>
              <div
                ><small>门店范围</small><strong>{{ storeLabel }}</strong></div
              >
            </article>
            <article>
              <span><ArtSvgIcon icon="ri:shield-user-line" /></span>
              <div
                ><small>账号身份</small><strong>{{ roleLabel }}</strong></div
              >
            </article>
            <article>
              <span><ArtSvgIcon icon="ri:apps-2-line" /></span>
              <div
                ><small>可用功能</small><strong>{{ entries.length }} 项</strong></div
              >
            </article>
          </div>
        </section>

        <section class="panel-card quick-section">
          <header class="panel-heading">
            <div>
              <span class="heading-icon bolt"><ArtSvgIcon icon="ri:flashlight-fill" /></span>
              <div><h2>快捷操作</h2><p>按当前账号权限显示</p></div>
            </div>
            <button type="button" :disabled="!entries.length" @click="openShortcutSettings">
              自定义<ArtSvgIcon icon="ri:settings-4-line" />
            </button>
          </header>

          <div v-if="visibleEntries.length" class="quick-grid">
            <button
              v-for="entry in visibleEntries"
              :key="entry.path"
              type="button"
              @click="openEntry(entry.path)"
            >
              <span class="quick-icon"
                ><ArtSvgIcon :icon="entry.meta.icon || 'ri:apps-line'"
              /></span>
              <strong>{{ displayTitle(entry.meta.title) }}</strong>
              <small>打开功能</small>
              <span class="quick-arrow"><ArtSvgIcon icon="ri:arrow-right-s-line" /></span>
            </button>
          </div>
          <ElEmpty v-else :image-size="54" :description="shortcutEmptyText" />
        </section>

        <section class="panel-card scope-section">
          <header class="panel-heading">
            <div>
              <span class="heading-icon shield"><ArtSvgIcon icon="ri:shield-check-line" /></span>
              <div><h2>我的操作权限范围</h2><p>基于当前账号可访问的功能模块</p></div>
            </div>
          </header>
          <div v-if="scopeGroups.length" class="scope-grid">
            <article v-for="group in scopeGroups" :key="group.path">
              <span><ArtSvgIcon :icon="group.meta.icon || 'ri:folder-3-line'" /></span>
              <div
                ><strong>{{ displayTitle(group.meta.title) }}</strong
                ><small>{{ countLeaves(group) }} 项可用功能</small></div
              >
            </article>
          </div>
          <p v-else class="scope-empty">当前账号暂无可用模块</p>
        </section>
      </main>

      <aside class="workspace-side">
        <section class="panel-card reserved-card announcement-card">
          <header class="panel-heading">
            <div>
              <span class="heading-illustration">
                <img :src="announcementImage" alt="" aria-hidden="true" />
              </span>
              <div><h2>公告栏</h2><p>平台与门店通知</p></div>
            </div>
            <ElBadge :value="announcementUnread" :hidden="announcementUnread === 0">
              <ElTag size="small" :type="announcementConnected ? 'success' : 'info'" effect="plain">
                {{ announcementConnected ? '实时' : '同步中' }}
              </ElTag>
            </ElBadge>
          </header>
          <div
            v-if="announcementLoading || announcements.length"
            v-loading="announcementLoading"
            class="announcement-body"
          >
            <button
              v-for="item in dashboardAnnouncements"
              :key="String(item.id)"
              type="button"
              :class="{ unread: !item.read }"
              @click="openAnnouncement(item)"
            >
              <span class="announcement-item-illustration">
                <img :src="announcementItemImage" alt="" aria-hidden="true" />
              </span>
              <span class="announcement-copy">
                <span class="announcement-title-row">
                  <strong>{{ item.title }}</strong>
                  <span class="announcement-level" :class="item.level.toLowerCase()">
                    {{ announcementLevelLabel[item.level] }}
                  </span>
                </span>
                <small>
                  {{ item.publisherName || `用户 ${item.publisherId}` }} ·
                  {{ item.publishTime || item.createdAt }}
                </small>
              </span>
              <span v-if="!item.read" class="unread-dot" aria-label="未读" />
            </button>
          </div>
          <button
            v-if="announcements.length > announcementPreviewLimit"
            type="button"
            class="announcement-more"
            @click="openAnnouncementCenter"
          >
            查看更多消息
            <ArtSvgIcon icon="ri:arrow-right-line" />
          </button>
          <div v-if="!announcementLoading && !announcements.length" class="reserved-body">
            <img :src="announcementImage" alt="公告栏插画" />
            <div><strong>暂无公告</strong><p>平台或门店发布公告后，将实时显示在这里。</p></div>
          </div>
        </section>

        <section class="panel-card reserved-card message-card">
          <header class="panel-heading">
            <div>
              <span class="heading-illustration">
                <img :src="messageImage" alt="" aria-hidden="true" />
              </span>
              <div><h2>消息中心</h2><p>订单、系统与业务消息</p></div>
            </div>
            <ElTag size="small" effect="plain">接口预留</ElTag>
          </header>
          <div class="reserved-body">
            <img :src="messageImage" alt="消息中心插画" />
            <div><strong>暂无消息</strong><p>消息接口接入后，将在这里展示未读动态。</p></div>
          </div>
        </section>
      </aside>
    </div>

    <ElDialog
      v-model="announcementDialogVisible"
      title="公告中心"
      width="min(980px, calc(100vw - 28px))"
      append-to-body
    >
      <div class="announcement-center">
        <aside class="announcement-center-list">
          <header>
            <strong>全部公告</strong>
            <span>{{ announcements.length }} 条</span>
          </header>
          <div class="announcement-center-scroll">
            <button
              v-for="item in announcements"
              :key="String(item.id)"
              type="button"
              :class="{
                active: String(item.id) === String(selectedAnnouncement?.id),
                unread: !item.read
              }"
              @click="selectAnnouncement(item)"
            >
              <span class="center-list-title">{{ item.title }}</span>
              <small>
                {{ item.publisherName || `用户 ${item.publisherId}` }} ·
                {{ item.publishTime || item.createdAt }}
              </small>
              <i v-if="!item.read" aria-label="未读" />
            </button>
          </div>
        </aside>
        <div class="announcement-center-detail">
          <AnnouncementDetailPanel :announcement="selectedAnnouncement" />
          <div v-if="selectedAnnouncement" class="announcement-switch">
            <ElButton
              size="small"
              plain
              :disabled="selectedAnnouncementIndex <= 0"
              @click="switchAnnouncement(-1)"
            >
              <ArtSvgIcon icon="ri:arrow-left-line" />上一条
            </ElButton>
            <span>{{ selectedAnnouncementIndex + 1 }} / {{ announcements.length }}</span>
            <ElButton
              size="small"
              plain
              :disabled="selectedAnnouncementIndex >= announcements.length - 1"
              @click="switchAnnouncement(1)"
            >
              下一条<ArtSvgIcon icon="ri:arrow-right-line" />
            </ElButton>
          </div>
        </div>
      </div>
    </ElDialog>

    <ElDialog
      v-model="shortcutDialogVisible"
      title="自定义快捷操作"
      width="min(620px, calc(100vw - 28px))"
      append-to-body
      destroy-on-close
    >
      <div class="shortcut-dialog-tip">
        <span>选择工作台需要展示的功能</span>
        <strong>{{ shortcutDraft.length }} / {{ quickLimit }}</strong>
      </div>
      <ElCheckboxGroup v-model="shortcutDraft" class="shortcut-options">
        <ElCheckbox
          v-for="entry in entries"
          :key="entry.path"
          :value="entry.path"
          :disabled="!shortcutDraft.includes(entry.path) && shortcutDraft.length >= quickLimit"
          border
        >
          <span class="shortcut-option-icon"
            ><ArtSvgIcon :icon="entry.meta.icon || 'ri:apps-line'"
          /></span>
          <span>{{ displayTitle(entry.meta.title) }}</span>
        </ElCheckbox>
      </ElCheckboxGroup>
      <template #footer>
        <div class="shortcut-dialog-footer">
          <ElButton text @click="resetShortcutDraft">恢复默认</ElButton>
          <div>
            <ElButton @click="shortcutDialogVisible = false">取消</ElButton>
            <ElButton type="primary" @click="saveShortcutSettings">保存设置</ElButton>
          </div>
        </div>
      </template>
    </ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { useMenuStore } from '@/store/modules/menu'
  import { useUserStore } from '@/store/modules/user'
  import { useAnnouncementStore } from '@/store/modules/announcement'
  import type { Announcement, AnnouncementLevel } from '@/api/announcement'
  import AnnouncementDetailPanel from '@/components/business/announcement-detail/index.vue'
  import { resolveUserAvatar } from '@/utils/user-avatar'
  import type { AppRouteRecord } from '@/types/router'
  import workspaceShop from '@/assets/images/brand/workspace-shop.png'
  import announcementImage from '@/assets/images/brand/announcement.png'
  import announcementItemImage from '@/assets/images/brand/announcement-megaphone.png'
  import messageImage from '@/assets/images/brand/message-center.png'

  defineOptions({ name: 'Console' })

  const session = useUserStore()
  const announcementStore = useAnnouncementStore()
  const {
    list: announcements,
    unreadCount: announcementUnread,
    connected: announcementConnected,
    loading: announcementLoading
  } = storeToRefs(announcementStore)
  const menu = useMenuStore()
  const router = useRouter()
  const { t } = useI18n()
  const quickLimit = 8
  const announcementPreviewLimit = 5
  const shortcutDialogVisible = ref(false)
  const announcementDialogVisible = ref(false)
  const selectedAnnouncement = ref<Announcement>()
  const announcementLevelLabel: Record<AnnouncementLevel, string> = {
    NORMAL: '普通',
    IMPORTANT: '重要',
    URGENT: '紧急'
  }
  const dashboardAnnouncements = computed(() =>
    announcements.value.slice(0, announcementPreviewLimit)
  )
  const selectedAnnouncementIndex = computed(() =>
    announcements.value.findIndex(
      (item) => String(item.id) === String(selectedAnnouncement.value?.id)
    )
  )
  const shortcutPaths = ref<string[]>([])
  const shortcutDraft = ref<string[]>([])
  const hour = new Date().getHours()
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  const date = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full' }).format(new Date())

  const displayName = computed(
    () => session.info.userName || session.info.nickname || session.info.username || '管理员'
  )
  const userAvatar = computed(() => resolveUserAvatar(session.info.avatar, session.info.gender))
  const roleLabel = computed(() => {
    const roles = session.info.roles || []
    if (roles.includes('SUPER_ADMIN')) return '超级管理员'
    if (roles.includes('ADMIN')) return '商户管理员'
    return roles.join(' / ') || '普通成员'
  })
  const tenantLabel = computed(
    () => session.activeTenant?.tenantName || session.info.tenantCode || '平台管理中心'
  )
  const storeLabel = computed(() => {
    if (session.isSuperAdmin && !session.activeTenant) return '全平台'
    if (session.activeStore?.storeName) return session.activeStore.storeName
    if (session.info.roles?.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role)))
      return '全部门店'
    return session.info.activeStoreId ? `门店 ${session.info.activeStoreId}` : '未选择门店'
  })

  const flatten = (nodes: AppRouteRecord[]): AppRouteRecord[] =>
    nodes.flatMap((node) =>
      node.children?.length
        ? flatten(node.children)
        : node.meta.isHide || node.path === '/dashboard/console'
          ? []
          : [node]
    )

  const entries = computed(() => flatten(menu.menuList))
  const shortcutStorageKey = computed(() => `liteshop-workspace-shortcuts:${session.scopeKey}`)
  const defaultShortcutPaths = computed(() =>
    entries.value.slice(0, quickLimit).map((entry) => entry.path)
  )
  const visibleEntries = computed(() => {
    const entryMap = new Map(entries.value.map((entry) => [entry.path, entry]))
    return shortcutPaths.value.flatMap((path) => {
      const entry = entryMap.get(path)
      return entry ? [entry] : []
    })
  })
  const shortcutEmptyText = computed(() =>
    entries.value.length
      ? '尚未添加快捷操作，点击右上角“自定义”进行选择'
      : '暂无业务菜单，请联系管理员分配权限'
  )
  const scopeGroups = computed(() =>
    menu.menuList.filter((node) => !node.meta.isHide && node.path !== '/dashboard/console')
  )
  const profilePath = computed(() => {
    const find = (nodes: AppRouteRecord[]): string => {
      for (const node of nodes) {
        if (String(node.component).replace(/\/index$/, '') === '/system/user-center')
          return node.path
        const child = find(node.children || [])
        if (child) return child
      }
      return ''
    }
    return find(menu.menuList)
  })

  function displayTitle(title: string) {
    return title.startsWith('menus.') ? t(title) : title
  }

  function countLeaves(node: AppRouteRecord): number {
    return node.children?.length ? flatten(node.children).length : 1
  }

  function loadShortcutSettings() {
    const stored = localStorage.getItem(shortcutStorageKey.value)
    if (stored === null) {
      shortcutPaths.value = defaultShortcutPaths.value
      return
    }

    try {
      const parsed = JSON.parse(stored)
      const availablePaths = new Set(entries.value.map((entry) => entry.path))
      shortcutPaths.value = Array.isArray(parsed)
        ? parsed
            .filter((path): path is string => typeof path === 'string' && availablePaths.has(path))
            .slice(0, quickLimit)
        : defaultShortcutPaths.value
    } catch {
      shortcutPaths.value = defaultShortcutPaths.value
    }
  }

  function openShortcutSettings() {
    shortcutDraft.value = [...shortcutPaths.value]
    shortcutDialogVisible.value = true
  }

  function resetShortcutDraft() {
    shortcutDraft.value = defaultShortcutPaths.value
  }

  function saveShortcutSettings() {
    shortcutPaths.value = [...shortcutDraft.value]
    localStorage.setItem(shortcutStorageKey.value, JSON.stringify(shortcutPaths.value))
    shortcutDialogVisible.value = false
  }

  async function openEntry(path: string) {
    try {
      const failure = await router.push(path)
      if (failure) console.error(`[Workspace] 导航被取消 ${path}`, failure)
    } catch (error) {
      console.error(`[Workspace] 无法打开 ${path}`, error)
    }
  }

  async function openAnnouncement(item: Announcement) {
    announcementDialogVisible.value = true
    await selectAnnouncement(item)
  }

  async function openAnnouncementCenter() {
    announcementDialogVisible.value = true
    if (selectedAnnouncementIndex.value < 0 && announcements.value.length) {
      await selectAnnouncement(announcements.value[0])
    }
  }

  async function selectAnnouncement(item: Announcement) {
    selectedAnnouncement.value = item
    await announcementStore.markRead(item).catch(() => undefined)
  }

  async function switchAnnouncement(offset: number) {
    const target = announcements.value[selectedAnnouncementIndex.value + offset]
    if (target) await selectAnnouncement(target)
  }

  watch([entries, shortcutStorageKey], loadShortcutSettings, { immediate: true })
  watch(announcements, (items) => {
    if (!selectedAnnouncement.value) return
    selectedAnnouncement.value = items.find(
      (item) => String(item.id) === String(selectedAnnouncement.value?.id)
    )
  })
</script>

<style scoped lang="scss">
  .workspace-page {
    color: var(--el-text-color-primary);
  }

  .welcome-banner {
    position: relative;
    min-height: 116px;
    padding: 14px 22px 12px;
    margin: -4px -8px 10px;
    overflow: hidden;
    background:
      radial-gradient(circle at 46% 10%, rgb(255 255 255 / 92%), transparent 29%),
      linear-gradient(110deg, #e9f5ff 0%, #f7fbff 50%, #d9edff 100%);
  }

  .welcome-copy {
    position: relative;
    z-index: 2;
    max-width: 56%;
  }

  .eyebrow {
    font-size: 11px;
    font-weight: 700;
    color: #1875e8;
    letter-spacing: 1.8px;
  }

  .welcome-copy h1 {
    margin: 7px 0 5px;
    font-size: 24px;
    color: #11294c;
  }

  .welcome-copy h1 span {
    font-size: 25px;
  }

  .welcome-copy p {
    margin: 0;
    font-size: 12px;
    color: #61738e;
  }

  .welcome-date {
    display: flex;
    gap: 7px;
    align-items: center;
    margin-top: 9px;
    font-size: 12px;
    color: #54749a;
  }

  .welcome-slogan {
    position: absolute;
    top: 18px;
    right: 25%;
    z-index: 2;
    display: flex;
    flex-direction: column;
    color: #1f67b9;
    rotate: -6deg;
  }

  .welcome-slogan strong {
    font-family: KaiTi, serif;
    font-size: 16px;
  }

  .welcome-slogan span {
    margin-top: 5px;
    font-size: 9px;
  }

  .welcome-banner > img {
    position: absolute;
    right: 0;
    bottom: -20px;
    width: min(29%, 300px);
    height: 190px;
    object-fit: contain;
  }

  .scope-alert {
    margin-top: 8px;
    border-radius: 10px;
  }

  .workspace-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(330px, 0.9fr);
    gap: 10px;
    align-items: start;
    margin-top: 10px;
  }

  .workspace-main,
  .workspace-side {
    display: grid;
    gap: 10px;
    min-width: 0;
  }

  .panel-card {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 14px;
  }

  .identity-card {
    overflow: hidden;
  }

  .identity-primary {
    display: flex;
    gap: 13px;
    align-items: center;
    padding: 14px 16px;
    background: linear-gradient(120deg, var(--el-bg-color), var(--el-color-primary-light-9));
  }

  .identity-avatar {
    width: 58px;
    height: 58px;
    object-fit: cover;
    background: #fff;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 10px 28px rgb(48 112 196 / 16%);
  }

  .identity-copy {
    flex: 1;
    min-width: 0;
  }

  .identity-name {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .identity-name h2 {
    margin: 0;
    font-size: 18px;
  }

  .identity-name span {
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 700;
    color: #93620a;
    background: #fff2d8;
    border-radius: 999px;
  }

  .identity-copy h3 {
    margin: 5px 0 4px;
    font-size: 13px;
  }

  .identity-copy p {
    margin: 0;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .identity-primary .el-button .art-svg-icon {
    margin-right: 5px;
  }

  .identity-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding: 9px 16px;
  }

  .identity-stats article {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
    padding: 2px 12px;
    border-right: 1px solid var(--el-border-color-lighter);
  }

  .identity-stats article:first-child {
    padding-left: 0;
  }

  .identity-stats article:last-child {
    border-right: 0;
  }

  .identity-stats article > span {
    display: grid;
    flex: 0 0 28px;
    place-items: center;
    height: 28px;
    font-size: 15px;
    color: #1677ef;
    background: #e8f3ff;
    border-radius: 10px;
  }

  .identity-stats div {
    min-width: 0;
  }

  .identity-stats small,
  .identity-stats strong {
    display: block;
  }

  .identity-stats small {
    margin-bottom: 2px;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .identity-stats strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quick-section,
  .scope-section,
  .reserved-card {
    padding: 13px 14px;
  }

  .panel-heading,
  .panel-heading > div {
    display: flex;
    align-items: center;
  }

  .panel-heading {
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .panel-heading > div {
    gap: 10px;
  }

  .panel-heading h2 {
    margin: 0;
    font-size: 15px;
  }

  .panel-heading p {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .panel-heading > button {
    display: flex;
    gap: 2px;
    align-items: center;
    color: var(--el-color-primary);
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .panel-heading > button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .heading-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    font-size: 17px;
    border-radius: 9px;
  }

  .heading-icon.bolt {
    color: #1475ec;
    background: #e8f3ff;
  }

  .heading-icon.shield {
    color: #168d7e;
    background: #e4f8f4;
  }

  .heading-illustration {
    display: grid;
    flex: 0 0 44px;
    place-items: center;
    width: 44px;
    height: 38px;
    overflow: hidden;
    background: linear-gradient(145deg, #edf7ff, #f8fbff);
    border: 1px solid rgb(64 158 255 / 14%);
    border-radius: 10px;
  }

  .heading-illustration img {
    width: 42px;
    height: 36px;
    object-fit: contain;
  }

  .quick-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .quick-grid > button {
    position: relative;
    min-height: 78px;
    padding: 9px 10px;
    overflow: hidden;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background: var(--el-fill-color-extra-light);
    border: 1px solid transparent;
    border-radius: 11px;
    transition: 0.22s ease;
  }

  .quick-grid > button:nth-child(4n + 1) {
    background: linear-gradient(145deg, #eef8ff, #e5f2ff);
  }

  .quick-grid > button:nth-child(4n + 2) {
    background: linear-gradient(145deg, #fff8ee, #fff0df);
  }

  .quick-grid > button:nth-child(4n + 3) {
    background: linear-gradient(145deg, #edf9ff, #e6f3ff);
  }

  .quick-grid > button:nth-child(4n) {
    background: linear-gradient(145deg, #f6f1ff, #eee8ff);
  }

  .quick-grid > button:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 10px 26px rgb(38 105 184 / 10%);
    transform: translateY(-2px);
  }

  .quick-icon {
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    font-size: 18px;
    color: #1675ed;
  }

  .quick-grid strong,
  .quick-grid small {
    display: block;
  }

  .quick-grid strong {
    margin: 4px 0 2px;
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quick-grid small {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .quick-arrow {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    color: var(--el-color-primary);
    background: rgb(255 255 255 / 75%);
    border-radius: 50%;
  }

  .scope-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .scope-grid article {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
    padding: 9px;
    background: var(--el-fill-color-extra-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
  }

  .scope-grid article > span {
    display: grid;
    flex: 0 0 28px;
    place-items: center;
    height: 28px;
    font-size: 15px;
    color: #397eea;
    background: var(--el-color-primary-light-9);
    border-radius: 10px;
  }

  .scope-grid article div {
    min-width: 0;
  }

  .scope-grid strong,
  .scope-grid small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .scope-grid strong {
    margin-bottom: 2px;
    font-size: 12px;
  }

  .scope-grid small {
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .scope-empty {
    margin: 18px 0;
    color: var(--el-text-color-secondary);
    text-align: center;
  }

  .workspace-side {
    position: sticky;
    top: 16px;
  }

  .reserved-card {
    min-height: 204px;
    overflow: hidden;
  }

  .reserved-body {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 139px;
    padding: 8px 6px;
    overflow: hidden;
    background: linear-gradient(
      135deg,
      var(--el-color-primary-light-9),
      var(--el-fill-color-extra-light)
    );
    border-radius: 11px;
  }

  .reserved-body img {
    width: 39%;
    max-height: 112px;
    object-fit: contain;
    filter: saturate(0.92);
  }

  .reserved-body > div {
    position: relative;
    z-index: 1;
    flex: 1;
  }

  .reserved-body strong {
    display: block;
    margin-bottom: 5px;
    font-size: 13px;
  }

  .reserved-body p {
    margin: 0;
    font-size: 11px;
    line-height: 1.55;
    color: var(--el-text-color-secondary);
  }

  .announcement-body {
    display: grid;
    gap: 6px;
    min-height: 112px;
  }

  .announcement-body > button {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
    min-width: 0;
    min-height: 52px;
    padding: 6px 9px 6px 6px;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background: var(--el-fill-color-extra-light);
    border: 1px solid transparent;
    border-radius: 10px;
    transition: 0.2s ease;
  }

  .announcement-body > button:hover,
  .announcement-body > button.unread {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
  }

  .announcement-item-illustration {
    display: grid;
    flex: 0 0 42px;
    place-items: center;
    width: 42px;
    height: 40px;
    overflow: hidden;
    background: linear-gradient(145deg, #eaf5ff, #fff);
    border-radius: 10px;
  }

  .announcement-item-illustration img {
    width: 42px;
    height: 40px;
    object-fit: contain;
    transform: rotate(-4deg) scale(1.08);
  }

  .announcement-title-row {
    display: flex;
    gap: 6px;
    align-items: center;
    min-width: 0;
  }

  .announcement-level {
    flex: 0 0 auto;
    padding: 3px 6px;
    font-size: 10px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 5px;
  }

  .announcement-level.important {
    color: #b66a00;
    background: #fff4db;
  }

  .announcement-level.urgent {
    color: #d33b32;
    background: #ffebe9;
  }

  .announcement-copy {
    flex: 1;
    min-width: 0;
  }

  .announcement-copy strong,
  .announcement-copy small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .announcement-copy strong {
    flex: 1;
    min-width: 0;
    font-size: 12px;
  }

  .announcement-copy small {
    margin-top: 3px;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .unread-dot {
    flex: 0 0 7px;
    width: 7px;
    height: 7px;
    background: var(--el-color-danger);
    border-radius: 50%;
  }

  .announcement-more {
    display: flex;
    gap: 5px;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 9px 0 2px;
    font-size: 12px;
    color: var(--el-color-primary);
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .announcement-more:hover {
    color: var(--el-color-primary-dark-2);
  }

  .announcement-center {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 14px;
    min-height: 410px;
  }

  .announcement-center-list {
    overflow: hidden;
    background: var(--el-fill-color-extra-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
  }

  .announcement-center-list > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .announcement-center-list > header strong {
    font-size: 14px;
  }

  .announcement-center-list > header span {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .announcement-center-scroll {
    max-height: 400px;
    padding: 7px;
    overflow-y: auto;
  }

  .announcement-center-scroll button {
    position: relative;
    display: block;
    width: 100%;
    padding: 10px 22px 10px 10px;
    margin-bottom: 5px;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 9px;
  }

  .announcement-center-scroll button:hover,
  .announcement-center-scroll button.active {
    background: var(--el-bg-color);
    border-color: var(--el-color-primary-light-7);
  }

  .center-list-title,
  .announcement-center-scroll small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .center-list-title {
    font-size: 12px;
    font-weight: 600;
  }

  .announcement-center-scroll small {
    margin-top: 5px;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .announcement-center-scroll i {
    position: absolute;
    top: 14px;
    right: 10px;
    width: 6px;
    height: 6px;
    background: var(--el-color-danger);
    border-radius: 50%;
  }

  .announcement-center-detail {
    min-width: 0;
  }

  .announcement-switch {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .announcement-switch span {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .dark .welcome-banner {
    background: linear-gradient(115deg, #14243d, #172b43 54%, #173b55);
  }

  .dark .welcome-copy h1,
  .dark .welcome-copy p,
  .dark .welcome-date,
  .dark .welcome-slogan {
    color: #e8f4ff;
  }

  .dark .quick-grid > button:nth-child(n) {
    background: var(--el-fill-color-light);
  }

  @media (width <= 1250px) {
    .workspace-grid {
      grid-template-columns: minmax(0, 1fr) 330px;
    }

    .scope-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .identity-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 0;
    }

    .identity-stats article:nth-child(2) {
      border-right: 0;
    }
  }

  @media (width <= 960px) {
    .workspace-grid {
      grid-template-columns: 1fr;
    }

    .workspace-side {
      position: static;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .welcome-slogan {
      display: none;
    }

    .welcome-copy {
      max-width: 70%;
    }
  }

  @media (width <= 700px) {
    .welcome-banner {
      min-height: 128px;
      padding: 18px 16px;
    }

    .welcome-copy {
      max-width: 100%;
    }

    .welcome-copy h1 {
      font-size: 23px;
    }

    .welcome-copy p {
      max-width: 75%;
      font-size: 12px;
    }

    .welcome-banner > img {
      right: -38px;
      width: 42%;
      opacity: 0.5;
    }

    .identity-primary {
      align-items: flex-start;
      padding: 14px;
    }

    .identity-avatar {
      width: 52px;
      height: 52px;
    }

    .identity-primary > .el-button {
      display: none;
    }

    .identity-stats {
      grid-template-columns: 1fr;
    }

    .identity-stats article {
      padding: 6px 0;
      border-right: 0;
    }

    .quick-grid,
    .scope-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .workspace-side {
      grid-template-columns: 1fr;
    }

    .quick-grid > button {
      min-height: 76px;
    }

    .announcement-center {
      grid-template-columns: 1fr;
    }

    .announcement-center-scroll {
      max-height: 190px;
    }
  }

  .shortcut-dialog-tip,
  .shortcut-dialog-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .shortcut-dialog-tip {
    padding: 10px 12px;
    margin-bottom: 14px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-extra-light);
    border-radius: 9px;
  }

  .shortcut-dialog-tip strong {
    color: var(--el-color-primary);
  }

  .shortcut-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    max-height: 360px;
    overflow-y: auto;
  }

  :deep(.shortcut-options .el-checkbox) {
    width: 100%;
    height: 46px;
    margin: 0;
  }

  :deep(.shortcut-options .el-checkbox__label) {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }

  .shortcut-option-icon {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 7px;
  }

  @media (width <= 480px) {
    .quick-grid,
    .scope-grid,
    .shortcut-options {
      grid-template-columns: 1fr;
    }
  }
</style>
