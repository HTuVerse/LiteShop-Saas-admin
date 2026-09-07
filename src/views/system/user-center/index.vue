<template>
  <div class="profile-page" :style="{ '--profile-sticky-top': `${headerHeight + 12}px` }">
    <aside class="profile-nav">
      <div class="nav-heading">
        <span class="nav-heading__icon"><ArtSvgIcon icon="ri:user-smile-line" /></span>
        <div>
          <h1>个人中心</h1>
          <p>管理个人信息、账号安全与工作范围</p>
        </div>
      </div>

      <nav aria-label="个人中心页面导航">
        <button
          v-for="item in sections"
          :key="item.id"
          type="button"
          :class="{ active: active === item.id }"
          @click="jump(item.id)"
        >
          <ArtSvgIcon :icon="item.icon" />
          <span>{{ item.label }}</span>
          <ArtSvgIcon class="nav-arrow" icon="ri:arrow-right-s-line" />
        </button>
      </nav>

      <div class="nav-art" aria-hidden="true">
        <div class="nav-art__copy">
          <strong>用更好的工具</strong>
          <span>成就更好的经营</span>
        </div>
        <img :src="profileStaff" alt="" />
      </div>
      <p class="nav-slogan">好味道 · 好管理 · 更美好的未来</p>
    </aside>

    <main class="profile-main">
      <section class="profile-hero">
        <div class="hero-user">
          <img class="hero-avatar" :src="userAvatar" alt="用户头像" />
          <div class="hero-copy">
            <div class="hero-title">
              <h2>{{ displayName }}</h2>
              <span>{{ roleLabel }}</span>
            </div>
            <p>{{ form.introduction || '完善个人资料，让团队更快认识你。' }}</p>
            <div class="hero-meta">
              <span><ArtSvgIcon icon="ri:phone-line" />{{ maskedPhone }}</span>
              <span><ArtSvgIcon icon="ri:mail-line" />{{ form.email || '未填写邮箱' }}</span>
              <span><ArtSvgIcon icon="ri:store-2-line" />{{ storeLabel }}</span>
            </div>
          </div>
        </div>
        <img class="hero-shop" :src="profileShop" alt="LiteShop 门店插画" />
      </section>

      <section class="summary-grid" aria-label="账号概览">
        <article>
          <span class="summary-icon blue"><ArtSvgIcon icon="ri:user-star-line" /></span>
          <div
            ><small>当前身份</small><strong>{{ roleLabel }}</strong></div
          >
        </article>
        <article>
          <span class="summary-icon cyan"><ArtSvgIcon icon="ri:store-2-line" /></span>
          <div
            ><small>工作范围</small><strong>{{ storeLabel }}</strong></div
          >
        </article>
        <article>
          <span class="summary-icon purple"><ArtSvgIcon icon="ri:shield-check-line" /></span>
          <div
            ><small>账号状态</small><strong>{{ accountStatus }}</strong></div
          >
        </article>
      </section>

      <section id="profile-basic" class="profile-card profile-basic">
        <header class="card-heading">
          <div>
            <span class="card-heading__icon blue"><ArtSvgIcon icon="ri:id-card-line" /></span>
            <div><h3>个人信息</h3><p>账号资料与联系方式</p></div>
          </div>
          <ElButton v-if="!editing" plain type="primary" size="small" @click="openEdit">
            <ArtSvgIcon icon="ri:edit-line" />
            编辑信息
          </ElButton>
          <div v-else class="edit-actions">
            <ElButton size="small" @click="cancelEdit">取消</ElButton>
            <ElButton type="primary" size="small" :loading="saving" @click="save">保存</ElButton>
          </div>
        </header>

        <div v-if="!editing" class="info-grid">
          <dl
            ><dt>姓名</dt><dd>{{ displayName }}</dd></dl
          >
          <dl
            ><dt>角色</dt><dd>{{ roleLabel }}</dd></dl
          >
          <dl
            ><dt>手机号</dt><dd>{{ maskedPhone }}</dd></dl
          >
          <dl
            ><dt>登录账号</dt><dd>{{ form.username || '—' }}</dd></dl
          >
          <dl
            ><dt>邮箱</dt><dd>{{ form.email || '未填写' }}</dd></dl
          >
          <dl
            ><dt>性别</dt><dd>{{ genderLabel }}</dd></dl
          >
          <dl
            ><dt>所属租户</dt><dd>{{ tenantLabel }}</dd></dl
          >
          <dl
            ><dt>个人简介</dt><dd>{{ form.introduction || '暂无个人简介' }}</dd></dl
          >
        </div>

        <ElForm v-else ref="formRef" :model="form" :rules="rules" label-position="top">
          <div class="edit-grid">
            <ElFormItem label="登录账号" prop="username">
              <ElInput v-model="form.username" :disabled="!canEdit" />
            </ElFormItem>
            <ElFormItem label="昵称">
              <ElInput v-model="form.nickname" :disabled="!canEdit" placeholder="请输入昵称" />
            </ElFormItem>
            <ElFormItem label="邮箱" prop="email">
              <ElInput v-model="form.email" :disabled="!canEdit" placeholder="请输入邮箱" />
            </ElFormItem>
            <ElFormItem label="性别">
              <ElSelect v-model="form.gender" :disabled="!canEdit">
                <ElOption label="保密" :value="0" />
                <ElOption label="男" :value="1" />
                <ElOption label="女" :value="2" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="生日">
              <ElDatePicker
                v-model="form.birthday"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择生日"
                :disabled="!canEdit"
              />
            </ElFormItem>
            <ElFormItem class="edit-grid__wide" label="个人简介">
              <ElInput
                v-model="form.introduction"
                type="textarea"
                :rows="2"
                maxlength="120"
                show-word-limit
                :disabled="!canEdit"
                placeholder="简单介绍一下自己"
              />
            </ElFormItem>
          </div>
        </ElForm>
      </section>

      <div class="detail-grid">
        <section id="profile-account" class="profile-card detail-card">
          <header class="mini-heading">
            <span class="card-heading__icon blue"
              ><ArtSvgIcon icon="ri:shield-keyhole-line"
            /></span>
            <h3>账号安全</h3>
          </header>
          <div class="detail-row">
            <span><ArtSvgIcon icon="ri:lock-password-line" />登录密码</span>
            <strong>••••••••</strong><small>如需修改请联系管理员</small>
          </div>
          <div class="detail-row">
            <span><ArtSvgIcon icon="ri:smartphone-line" />绑定手机</span>
            <strong>{{ maskedPhone }}</strong
            ><small>{{ session.info.phone ? '已绑定' : '未绑定' }}</small>
          </div>
        </section>

        <section id="profile-scope" class="profile-card detail-card">
          <header class="mini-heading">
            <span class="card-heading__icon cyan"><ArtSvgIcon icon="ri:settings-3-line" /></span>
            <h3>工作范围</h3>
          </header>
          <div class="detail-row">
            <span><ArtSvgIcon icon="ri:building-2-line" />所属租户</span>
            <strong>{{ tenantLabel }}</strong
            ><small>当前工作空间</small>
          </div>
          <div class="detail-row">
            <span><ArtSvgIcon icon="ri:store-2-line" />可用范围</span>
            <strong>{{ storeLabel }}</strong
            ><small>{{ moduleCount }} 个可见模块</small>
          </div>
        </section>
      </div>

      <section id="profile-quick" class="quick-section">
        <header class="quick-heading">
          <ArtSvgIcon icon="ri:flashlight-fill" />
          <h3>快捷操作</h3>
        </header>
        <div class="quick-grid">
          <button type="button" class="quick-blue" @click="openEdit">
            <span><ArtSvgIcon icon="ri:edit-line" /></span>
            <div><strong>编辑资料</strong><small>完善个人信息</small></div>
            <ArtSvgIcon icon="ri:arrow-right-s-line" />
          </button>
          <button type="button" class="quick-cyan" @click="lockScreen">
            <span><ArtSvgIcon icon="ri:lock-line" /></span>
            <div><strong>锁定屏幕</strong><small>离开时保护账号</small></div>
            <ArtSvgIcon icon="ri:arrow-right-s-line" />
          </button>
          <button type="button" class="quick-purple" @click="goDashboard">
            <span><ArtSvgIcon icon="ri:dashboard-line" /></span>
            <div><strong>返回工作台</strong><small>查看经营概览</small></div>
            <ArtSvgIcon icon="ri:arrow-right-s-line" />
          </button>
          <button type="button" class="quick-red" @click="signOut">
            <span><ArtSvgIcon icon="ri:logout-box-r-line" /></span>
            <div><strong>退出登录</strong><small>安全退出当前账号</small></div>
            <ArtSvgIcon icon="ri:arrow-right-s-line" />
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
  import { useElementSize } from '@vueuse/core'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { useRouter } from 'vue-router'
  import { fetchGetUserInfo, updateProfile } from '@/api/auth'
  import { useMenuStore } from '@/store/modules/menu'
  import { useUserStore } from '@/store/modules/user'
  import { mittBus } from '@/utils/sys'
  import { resolveUserAvatar } from '@/utils/user-avatar'
  import type { AppRouteRecord } from '@/types/router'
  import profileShop from '@/assets/images/brand/profile-shop.png'
  import profileStaff from '@/assets/images/brand/profile-staff.png'

  defineOptions({ name: 'UserCenter' })

  const router = useRouter()
  const menu = useMenuStore()
  const session = useUserStore()
  const saving = ref(false)
  const editing = ref(false)
  const formRef = ref<FormInstance>()
  const active = ref('basic')
  const headerElement = ref<HTMLElement>()
  const { height: headerHeight } = useElementSize(headerElement)
  const sections = [
    { id: 'basic', label: '基本信息', icon: 'ri:user-line' },
    { id: 'account', label: '账号与安全', icon: 'ri:shield-user-line' },
    { id: 'scope', label: '门店与权限', icon: 'ri:store-2-line' },
    { id: 'quick', label: '快捷操作', icon: 'ri:flashlight-line' }
  ]

  const form = reactive(createForm())
  const rules: FormRules = {
    username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
    email: [{ type: 'email', message: '请输入有效邮箱', trigger: 'blur' }]
  }

  const displayName = computed(
    () => form.nickname || session.info.userName || form.username || '管理员'
  )
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
  const accountStatus = computed(() => (session.info.status === '0' ? '已停用' : '正常'))
  const genderLabel = computed(() => ({ 0: '保密', 1: '男', 2: '女' }[form.gender] || '保密'))
  const userAvatar = computed(() => resolveUserAvatar(session.info.avatar, form.gender))
  const canEdit = computed(() => !(session.isSuperAdmin && !!session.activeTenant))
  const maskedPhone = computed(() => {
    const phone = String(session.info.phone || '')
    return phone ? phone.replace(/(\d{3})\d+(\d{4})/, '$1 **** $2') : '未绑定手机'
  })
  const moduleCount = computed(() => countMenus(menu.menuList))

  function createForm() {
    return {
      id: session.info.id,
      username: session.info.username || '',
      nickname: session.info.nickname || '',
      email: session.info.email || '',
      gender: session.info.gender === '男' ? 1 : session.info.gender === '女' ? 2 : 0,
      birthday: session.info.birthday || '',
      introduction: session.info.introduction || ''
    }
  }

  function resetForm() {
    Object.assign(form, createForm())
  }

  function countMenus(items: AppRouteRecord[]): number {
    return items.reduce((total, item) => {
      if (item.meta?.isHide) return total
      return total + 1 + countMenus(item.children || [])
    }, 0)
  }

  function jump(id: string) {
    active.value = id
    document.getElementById(`profile-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function syncActiveSection() {
    const threshold = headerHeight.value + 80
    let current = sections[0].id
    for (const item of sections) {
      const element = document.getElementById(`profile-${item.id}`)
      if (element && element.getBoundingClientRect().top <= threshold) current = item.id
    }
    active.value = current
  }

  async function openEdit() {
    editing.value = true
    await nextTick()
    jump('basic')
  }

  function cancelEdit() {
    resetForm()
    editing.value = false
  }

  async function save() {
    if (saving.value || !canEdit.value || !(await formRef.value?.validate().catch(() => false)))
      return
    saving.value = true
    try {
      await updateProfile({ ...form, birthday: form.birthday || null })
      session.setUserInfo(await fetchGetUserInfo())
      resetForm()
      editing.value = false
      ElMessage.success('资料已更新')
    } finally {
      saving.value = false
    }
  }

  function lockScreen() {
    mittBus.emit('openLockScreen')
  }

  function goDashboard() {
    void router.push('/dashboard/console')
  }

  async function signOut() {
    const confirmed = await ElMessageBox.confirm('确定要退出当前账号吗？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => true)
      .catch(() => false)
    if (!confirmed) return
    await session.signOut()
  }

  onMounted(() => {
    headerElement.value = document.getElementById('app-header') || undefined
    document.addEventListener('scroll', syncActiveSection, true)
  })
  onBeforeUnmount(() => document.removeEventListener('scroll', syncActiveSection, true))
</script>

<style scoped lang="scss">
  .profile-page {
    display: grid;
    grid-template-columns: 222px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
    height: calc(100vh - var(--profile-sticky-top) - 3px);
    height: calc(100dvh - var(--profile-sticky-top) - 3px);
    overflow: hidden;
    color: var(--el-text-color-primary);
  }

  .profile-nav,
  .profile-card,
  .summary-grid article {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 14px;
  }

  .profile-nav {
    position: relative;
    align-self: start;
    height: 100%;
    min-height: 0;
    padding: 18px 12px 0;
    overflow: hidden;
    overscroll-behavior: contain;
    background: radial-gradient(circle at 110% 14%, rgb(73 150 255 / 18%), transparent 36%),
      linear-gradient(165deg, var(--el-bg-color) 0%, #eef6ff 65%, #dcecff 100%);
  }

  .nav-heading {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 0 7px 16px;
  }

  .nav-heading__icon {
    display: grid;
    flex: 0 0 38px;
    place-items: center;
    height: 38px;
    color: #fff;
    background: linear-gradient(145deg, #1677ff, #40d1ce);
    border-radius: 12px;
    box-shadow: 0 8px 18px rgb(22 119 255 / 20%);
  }

  .nav-heading__icon .art-svg-icon {
    font-size: 20px;
  }

  .nav-heading h1 {
    margin: 0;
    font-size: 18px;
    line-height: 1.2;
  }

  .nav-heading p {
    margin: 4px 0 0;
    font-size: 10px;
    line-height: 1.35;
    color: var(--el-text-color-secondary);
  }

  .profile-nav nav {
    position: relative;
    z-index: 3;
    max-height: calc(100% - 280px);
    padding-right: 2px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .profile-nav nav::-webkit-scrollbar {
    width: 4px;
  }

  .profile-nav nav::-webkit-scrollbar-thumb {
    background: rgb(77 133 197 / 28%);
    border-radius: 999px;
  }

  .profile-nav nav button {
    display: flex;
    gap: 10px;
    align-items: center;
    width: 100%;
    height: 43px;
    padding: 0 13px;
    margin-bottom: 6px;
    color: #385575;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 11px;
    transition: 0.2s ease;
  }

  .profile-nav nav button:hover {
    color: var(--el-color-primary);
    background: rgb(255 255 255 / 65%);
  }

  .profile-nav nav button.active {
    color: #fff;
    background: linear-gradient(110deg, #176ff2, #4aa3ff);
    box-shadow: 0 8px 20px rgb(23 111 242 / 22%);
  }

  .profile-nav nav button span {
    flex: 1;
    font-weight: 600;
  }

  .nav-arrow {
    opacity: 0.72;
  }

  .nav-art {
    position: absolute;
    inset: 260px 0 0;
    overflow: hidden;
    pointer-events: none;
  }

  .nav-art::before {
    position: absolute;
    inset: 0;
    z-index: 1;
    content: '';
    background: linear-gradient(180deg, #edf6ff 0%, transparent 18%, transparent 84%, #63a7ef 100%);
  }

  .nav-art__copy {
    position: absolute;
    top: 22px;
    right: 14px;
    z-index: 3;
    color: #2e64a4;
    text-align: right;
    transform: rotate(-6deg);
  }

  .nav-art__copy strong,
  .nav-art__copy span {
    display: block;
  }

  .nav-art__copy strong {
    font-size: 13px;
  }

  .nav-art__copy span {
    margin-top: 3px;
    font-size: 11px;
  }

  .nav-art img {
    position: absolute;
    bottom: -72px;
    left: 50%;
    z-index: 2;
    width: 290px;
    max-width: none;
    transform: translateX(-50%);
  }

  .nav-slogan {
    position: absolute;
    right: 0;
    bottom: 8px;
    left: 0;
    z-index: 4;
    margin: 0;
    font-size: 9px;
    color: rgb(255 255 255 / 88%);
    text-align: center;
  }

  .profile-main {
    display: grid;
    gap: 10px;
    min-width: 0;
    height: 100%;
    padding-right: 3px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .profile-main::-webkit-scrollbar {
    width: 5px;
  }

  .profile-main::-webkit-scrollbar-thumb {
    background: rgb(93 124 160 / 22%);
    border-radius: 999px;
  }

  .profile-hero {
    position: relative;
    display: flex;
    min-height: 130px;
    padding: 16px 235px 16px 20px;
    overflow: hidden;
    background: radial-gradient(circle at 58% 0%, rgb(255 255 255 / 84%), transparent 34%),
      linear-gradient(120deg, #eaf4ff 0%, #f4faff 54%, #dcecff 100%);
    border: 1px solid #dceaff;
    border-radius: 14px;
  }

  .hero-user {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .hero-avatar {
    flex: 0 0 76px;
    width: 76px;
    height: 76px;
    object-fit: cover;
    border: 5px solid rgb(255 255 255 / 90%);
    border-radius: 50%;
    box-shadow: 0 8px 20px rgb(44 112 188 / 14%);
  }

  .hero-copy {
    min-width: 0;
    margin-left: 17px;
  }

  .hero-title {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .hero-title h2 {
    margin: 0;
    overflow: hidden;
    font-size: 23px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hero-title span {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    color: #176ff2;
    white-space: nowrap;
    background: rgb(255 255 255 / 72%);
    border-radius: 999px;
  }

  .hero-copy > p {
    margin: 6px 0 12px;
    overflow: hidden;
    font-size: 12px;
    color: #607b9c;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hero-meta {
    display: flex;
    gap: 18px;
    color: #587496;
  }

  .hero-meta span {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    min-width: 0;
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hero-meta .art-svg-icon {
    flex: 0 0 auto;
    font-size: 15px;
    color: #1677ff;
  }

  .hero-shop {
    position: absolute;
    right: 8px;
    bottom: -20px;
    z-index: 1;
    width: 225px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .summary-grid article {
    display: flex;
    gap: 11px;
    align-items: center;
    min-width: 0;
    height: 70px;
    padding: 10px 13px;
  }

  .summary-icon,
  .card-heading__icon {
    display: grid;
    flex: 0 0 38px;
    place-items: center;
    height: 38px;
    border-radius: 11px;
  }

  .summary-icon .art-svg-icon,
  .card-heading__icon .art-svg-icon {
    font-size: 20px;
  }

  .blue {
    color: #1475e8;
    background: #e9f3ff;
  }

  .cyan {
    color: #08a39b;
    background: #e5faf7;
  }

  .purple {
    color: #7653ea;
    background: #f1ebff;
  }

  .summary-grid article div {
    min-width: 0;
  }

  .summary-grid small,
  .summary-grid strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .summary-grid small {
    margin-bottom: 4px;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .summary-grid strong {
    font-size: 14px;
  }

  .profile-card {
    padding: 12px 16px;
    scroll-margin-top: calc(var(--profile-sticky-top) + 6px);
  }

  .card-heading,
  .card-heading > div,
  .mini-heading {
    display: flex;
    align-items: center;
  }

  .card-heading {
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .card-heading > div:first-child {
    gap: 10px;
  }

  .card-heading h3,
  .mini-heading h3,
  .quick-heading h3 {
    margin: 0;
    font-size: 15px;
  }

  .card-heading p {
    margin: 2px 0 0;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .card-heading__icon {
    flex-basis: 34px;
    height: 34px;
    border-radius: 10px;
  }

  .card-heading__icon .art-svg-icon {
    font-size: 18px;
  }

  .edit-actions {
    display: flex;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 34px;
    padding: 9px 4px 1px;
  }

  .info-grid dl {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    min-width: 0;
    padding: 5px 0;
    margin: 0;
  }

  .info-grid dt,
  .info-grid dd {
    overflow: hidden;
    font-size: 11px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .info-grid dt {
    color: var(--el-text-color-secondary);
  }

  .info-grid dd {
    margin: 0;
    font-weight: 500;
  }

  .edit-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0 12px;
    padding-top: 10px;
  }

  .edit-grid__wide {
    grid-column: span 2;
  }

  .edit-grid :deep(.el-form-item) {
    margin-bottom: 10px;
  }

  .edit-grid :deep(.el-form-item__label) {
    padding-bottom: 3px;
    font-size: 11px;
    line-height: 18px;
  }

  .edit-grid :deep(.el-select),
  .edit-grid :deep(.el-date-editor) {
    width: 100%;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .detail-card {
    padding: 11px 14px 8px;
  }

  .mini-heading {
    gap: 9px;
    padding-bottom: 7px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .detail-row {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    min-width: 0;
    padding: 7px 2px;
  }

  .detail-row + .detail-row {
    border-top: 1px dashed var(--el-border-color-extra-light);
  }

  .detail-row span {
    display: inline-flex;
    gap: 7px;
    align-items: center;
    font-size: 11px;
    color: var(--el-text-color-regular);
  }

  .detail-row span .art-svg-icon {
    color: #6280a4;
  }

  .detail-row strong {
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-row small {
    font-size: 9px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  .quick-section {
    scroll-margin-top: calc(var(--profile-sticky-top) + 6px);
  }

  .quick-heading {
    display: flex;
    gap: 7px;
    align-items: center;
    padding: 0 3px 6px;
  }

  .quick-heading > .art-svg-icon {
    font-size: 18px;
    color: #176ff2;
  }

  .quick-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 9px;
  }

  .quick-grid button {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) 15px;
    gap: 8px;
    align-items: center;
    min-width: 0;
    height: 61px;
    padding: 8px 10px;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: 12px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .quick-grid button:hover {
    box-shadow: 0 8px 20px rgb(58 100 151 / 13%);
    transform: translateY(-2px);
  }

  .quick-grid button > span {
    display: grid;
    place-items: center;
    height: 32px;
    background: rgb(255 255 255 / 72%);
    border-radius: 9px;
  }

  .quick-grid button div {
    min-width: 0;
  }

  .quick-grid button strong,
  .quick-grid button small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quick-grid button strong {
    font-size: 11px;
  }

  .quick-grid button small {
    margin-top: 3px;
    font-size: 9px;
    color: var(--el-text-color-secondary);
  }

  .quick-blue {
    background: linear-gradient(135deg, #ecf5ff, #f7fbff);
    border-color: #d9eaff !important;
  }

  .quick-cyan {
    background: linear-gradient(135deg, #eafbf7, #f7fffd);
    border-color: #d5f3eb !important;
  }

  .quick-purple {
    background: linear-gradient(135deg, #f2edff, #fbf9ff);
    border-color: #e5dcff !important;
  }

  .quick-red {
    color: #d9364f !important;
    background: linear-gradient(135deg, #fff0f2, #fff9fa);
    border-color: #ffdce2 !important;
  }

  @media (width <= 1200px) {
    .profile-page {
      grid-template-columns: 194px minmax(0, 1fr);
    }

    .profile-nav {
      padding-right: 10px;
      padding-left: 10px;
    }

    .nav-heading__icon {
      display: none;
    }

    .profile-hero {
      padding-right: 190px;
    }

    .hero-shop {
      width: 185px;
    }

    .hero-meta span:first-child {
      display: none;
    }

    .detail-row {
      grid-template-columns: 96px minmax(0, 1fr);
    }

    .detail-row small {
      display: none;
    }
  }

  @media (width <= 900px) {
    .profile-page {
      display: block;
      height: auto;
      overflow: visible;
    }

    .profile-nav {
      position: static;
      height: auto;
      min-height: 0;
      padding: 13px;
      margin-bottom: 10px;
    }

    .profile-main {
      height: auto;
      padding-right: 0;
      overflow: visible;
      scrollbar-gutter: auto;
    }

    .nav-heading {
      padding-bottom: 10px;
    }

    .nav-heading__icon {
      display: grid;
    }

    .profile-nav nav {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
      max-height: none;
      padding-right: 0;
      overflow: visible;
      scrollbar-gutter: auto;
    }

    .profile-nav nav button {
      justify-content: center;
      height: 38px;
      padding: 0 7px;
      margin: 0;
      font-size: 11px;
    }

    .profile-nav nav button > .art-svg-icon:first-child,
    .profile-nav nav button .nav-arrow,
    .nav-art,
    .nav-slogan {
      display: none;
    }
  }

  @media (height <= 720px) and (width > 900px) {
    .profile-nav nav {
      max-height: calc(100% - 72px);
    }

    .nav-art,
    .nav-slogan {
      display: none;
    }
  }

  @media (width <= 680px) {
    .profile-hero {
      min-height: 124px;
      padding: 14px;
    }

    .hero-shop {
      display: none;
    }

    .hero-avatar {
      flex-basis: 64px;
      width: 64px;
      height: 64px;
    }

    .hero-title h2 {
      font-size: 19px;
    }

    .hero-meta span:nth-child(2) {
      display: none;
    }

    .summary-grid,
    .detail-grid {
      grid-template-columns: 1fr;
    }

    .summary-grid article {
      height: 58px;
    }

    .info-grid,
    .edit-grid {
      grid-template-columns: 1fr;
    }

    .edit-grid__wide {
      grid-column: auto;
    }

    .quick-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  html.dark {
    .profile-nav {
      background: radial-gradient(circle at 110% 14%, rgb(73 150 255 / 14%), transparent 36%),
        linear-gradient(165deg, var(--el-bg-color) 0%, #15263c 100%);
    }

    .profile-hero {
      background: linear-gradient(120deg, #172a42, #142238 55%, #1c3556);
      border-color: #294561;
    }

    .hero-title span {
      background: rgb(255 255 255 / 8%);
    }

    .nav-art::before {
      background: linear-gradient(180deg, #15263c 0%, transparent 20%, #153864 100%);
    }

    .blue,
    .cyan,
    .purple,
    .quick-grid button {
      background: var(--el-fill-color-light);
    }
  }
</style>
