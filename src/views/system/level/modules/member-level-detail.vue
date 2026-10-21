<template>
  <ElDialog
    v-model="visible"
    class="member-detail-dialog"
    width="min(430px, 100vw)"
    :show-close="false"
    :close-on-click-modal="true"
    append-to-body
    align-center
  >
    <template #header>
      <div class="preview-heading">
        <span>会员等级详情预览</span>
        <span>成长值与权益为界面示例</span>
      </div>
    </template>

    <div
      v-if="displayLevels.length"
      class="member-screen"
      :class="`theme-${currentTheme.key}`"
      :style="{ '--scene-image': `url(${currentTheme.scene})` }"
      tabindex="0"
      aria-label="会员等级详情，使用左右方向键切换等级"
      @keydown.left.prevent="changeLevel(-1)"
      @keydown.right.prevent="changeLevel(1)"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="pointerStartX = null"
    >
      <div class="scene-background" aria-hidden="true"></div>
      <div class="scene-wash" aria-hidden="true"></div>

      <div class="screen-content">
        <div class="status-bar" aria-hidden="true">
          <span>9:41</span>
          <span class="status-icons"
            ><i class="signal"></i><i class="wifi"></i><i class="battery"></i
          ></span>
        </div>

        <header class="screen-header">
          <button class="back-button" type="button" aria-label="关闭详情" @click="visible = false">
            <ArtSvgIcon icon="ri:arrow-left-s-line" />
          </button>
          <strong>会员中心</strong>
          <button class="rules-button" type="button" @click="rulesOpen = true">规则说明</button>
        </header>

        <nav class="tier-navigation" aria-label="会员等级">
          <button
            class="tier-arrow"
            type="button"
            aria-label="上一个等级"
            :disabled="activeIndex === 0"
            @click="changeLevel(-1)"
            ><ArtSvgIcon icon="ri:arrow-left-s-line"
          /></button>
          <div class="tier-list">
            <button
              v-for="(level, index) in displayLevels"
              :key="level.id || `${level.levelCode}-${index}`"
              class="tier-option"
              :class="{ active: activeIndex === index }"
              type="button"
              :aria-current="activeIndex === index ? 'true' : undefined"
              @click="activeIndex = index"
            >
              <img :src="themeFor(index).badge" alt="" />
              <span>{{ level.levelName }}</span>
            </button>
          </div>
          <button
            class="tier-arrow"
            type="button"
            aria-label="下一个等级"
            :disabled="activeIndex === displayLevels.length - 1"
            @click="changeLevel(1)"
            ><ArtSvgIcon icon="ri:arrow-right-s-line"
          /></button>
        </nav>

        <main class="level-main">
          <div class="level-intro">
            <h1>{{ currentLevel.levelName }}</h1>
            <p>{{ currentTheme.slogan }}</p>
          </div>

          <div class="growth-block">
            <div class="growth-copy">
              <span>成长值</span>
              <strong>{{ previewGrowth }}</strong>
              <span v-if="nextThreshold !== null">/ {{ nextThreshold }}</span>
              <span v-else>+</span>
            </div>
            <div
              class="growth-track"
              role="progressbar"
              :aria-valuenow="previewGrowth"
              :aria-valuemin="0"
              :aria-valuemax="nextThreshold ?? previewGrowth"
              :aria-label="`${currentLevel.levelName}成长值`"
              ><span :style="{ width: `${progressPercent}%` }"></span
            ></div>
          </div>

          <button class="upgrade-button" type="button" @click="handlePrimaryAction">
            {{ activeIndex === displayLevels.length - 1 ? '尊享权益' : '去升级' }}
            <ArtSvgIcon icon="ri:arrow-right-s-line" />
          </button>

          <section ref="benefitsRef" class="benefits-card" aria-labelledby="benefits-title">
            <div class="benefits-heading">
              <span class="benefits-crown"><ArtSvgIcon icon="ri:vip-crown-2-fill" /></span>
              <div>
                <h2 id="benefits-title">会员权益</h2>
                <p>{{ currentLevel.levelName }}专享 · 5项核心权益</p>
              </div>
            </div>
            <div class="benefits-grid">
              <div
                v-for="benefit in currentTheme.benefits"
                :key="benefit.title"
                class="benefit-item"
              >
                <span class="benefit-icon"><ArtSvgIcon :icon="benefit.icon" /></span>
                <strong>{{ benefit.title }}</strong>
                <small>{{ benefit.value }}</small>
              </div>
            </div>
            <p v-if="currentLevel.benefits" class="configured-benefits">
              方案权益：{{ currentLevel.benefits }}
            </p>
          </section>
        </main>
      </div>

      <div v-if="rulesOpen" class="rules-overlay" @click.self="rulesOpen = false">
        <section class="rules-sheet" aria-label="会员等级规则">
          <div class="rules-title">
            <h2>等级规则</h2>
            <button type="button" aria-label="关闭规则" @click="rulesOpen = false">
              <ArtSvgIcon icon="ri:close-line" />
            </button>
          </div>
          <p>会员等级随成长值提升。以下为当前方案设置的等级门槛：</p>
          <ul>
            <li v-for="level in displayLevels" :key="level.id || level.levelCode">
              <span>{{ level.levelName }}</span
              ><strong>{{ level.requiredExp }} 成长值</strong>
            </li>
          </ul>
        </section>
      </div>
    </div>
    <div v-else class="empty-preview">当前方案暂无会员等级</div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import type { MemberLevel } from '@/api/member-level'
  import bronzeScene from '@/assets/images/member-level/bronze-scene.jpg'
  import silverScene from '@/assets/images/member-level/silver-scene.jpg'
  import goldScene from '@/assets/images/member-level/gold-scene.jpg'
  import platinumScene from '@/assets/images/member-level/platinum-scene.jpg'
  import blackScene from '@/assets/images/member-level/black-scene.jpg'
  import bronzeBadge from '@/assets/images/member-level/bronze-badge.jpg'
  import silverBadge from '@/assets/images/member-level/silver-badge.jpg'
  import goldBadge from '@/assets/images/member-level/gold-badge.jpg'
  import platinumBadge from '@/assets/images/member-level/platinum-badge.jpg'
  import blackBadge from '@/assets/images/member-level/black-badge.jpg'

  type Benefit = { title: string; value: string; icon: string }
  type Theme = {
    key: string
    scene: string
    badge: string
    slogan: string
    growth: number
    benefits: Benefit[]
  }

  const benefits = (
    discount: string,
    gifts: string,
    points: string,
    service: string
  ): Benefit[] => [
    { title: '专属折扣', value: discount, icon: 'ri:price-tag-3-fill' },
    { title: '会员礼包', value: gifts, icon: 'ri:gift-fill' },
    { title: '生日福利', value: '专属惊喜', icon: 'ri:cake-2-fill' },
    { title: '积分加速', value: points, icon: 'ri:rocket-fill' },
    { title: '专属客服', value: service, icon: 'ri:customer-service-2-fill' }
  ]
  const themes: Theme[] = [
    {
      key: 'bronze',
      scene: bronzeScene,
      badge: bronzeBadge,
      slogan: '美好生活 · 从这里开始',
      growth: 120,
      benefits: benefits('9.8折', '每月1份', '1.2倍', '优先响应')
    },
    {
      key: 'silver',
      scene: silverScene,
      badge: silverBadge,
      slogan: '品质升级 · 更多精彩',
      growth: 1200,
      benefits: benefits('9.5折', '每月2份', '1.5倍', '优先响应')
    },
    {
      key: 'gold',
      scene: goldScene,
      badge: goldBadge,
      slogan: '尊享权益 · 精彩加倍',
      growth: 3200,
      benefits: benefits('9折', '每月3份', '2倍', '优先响应')
    },
    {
      key: 'platinum',
      scene: platinumScene,
      badge: platinumBadge,
      slogan: '尊贵体验 · 与众不同',
      growth: 6500,
      benefits: benefits('8.8折', '每月4份', '2.5倍', '专属通道')
    },
    {
      key: 'black',
      scene: blackScene,
      badge: blackBadge,
      slogan: '至尊礼遇 · 畅享非凡',
      growth: 12000,
      benefits: benefits('8折', '每月5份', '3倍', '1对1服务')
    }
  ]

  const props = defineProps<{ modelValue: boolean; levels: MemberLevel[] }>()
  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const displayLevels = computed(() =>
    [...props.levels]
      .filter((level) => level.status === 1)
      .sort((a, b) => a.requiredExp - b.requiredExp || a.sort - b.sort)
  )
  const activeIndex = ref(0)
  const rulesOpen = ref(false)
  const benefitsRef = ref<HTMLElement | null>(null)
  const pointerStartX = ref<number | null>(null)
  const themeFor = (index: number) => themes[Math.min(index, themes.length - 1)]
  const currentLevel = computed(
    () => displayLevels.value[activeIndex.value] || displayLevels.value[0]
  )
  const currentTheme = computed(() => themeFor(activeIndex.value))
  const nextThreshold = computed(
    () => displayLevels.value[activeIndex.value + 1]?.requiredExp ?? null
  )
  const previewGrowth = computed(() =>
    nextThreshold.value === null
      ? Math.max(currentTheme.value.growth, currentLevel.value.requiredExp)
      : Math.min(currentTheme.value.growth, Math.max(0, nextThreshold.value - 1))
  )
  const progressPercent = computed(() =>
    nextThreshold.value && nextThreshold.value > 0
      ? Math.min(100, Math.max(0, (previewGrowth.value / nextThreshold.value) * 100))
      : 100
  )

  function changeLevel(offset: number) {
    activeIndex.value = Math.max(
      0,
      Math.min(displayLevels.value.length - 1, activeIndex.value + offset)
    )
  }
  function onPointerDown(event: PointerEvent) {
    if (event.target instanceof Element && event.target.closest('button, .rules-overlay')) return
    pointerStartX.value = event.clientX
  }
  function onPointerUp(event: PointerEvent) {
    if (pointerStartX.value === null) return
    const distance = event.clientX - pointerStartX.value
    pointerStartX.value = null
    if (Math.abs(distance) > 45) changeLevel(distance < 0 ? 1 : -1)
  }
  function handlePrimaryAction() {
    if (activeIndex.value === displayLevels.value.length - 1) {
      benefitsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else changeLevel(1)
  }
  watch(
    () => props.modelValue,
    (open) => {
      if (open) activeIndex.value = 0
      else rulesOpen.value = false
    }
  )
  watch(displayLevels, () => {
    activeIndex.value = Math.min(activeIndex.value, Math.max(0, displayLevels.value.length - 1))
  })
</script>

<style lang="scss">
  .member-detail-dialog {
    padding: 0 !important;
    overflow: hidden;
    border-radius: 20px !important;

    .el-dialog__header {
      padding: 9px 15px;
      margin: 0;
      background: #fff;
    }

    .el-dialog__body {
      padding: 0;
    }
  }

  .preview-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 700;
    color: #252b39;

    span + span {
      font-size: 11px;
      font-weight: 400;
      color: #8991a1;
    }
  }

  .empty-preview {
    padding: 80px 20px;
    color: #87909c;
    text-align: center;
  }
</style>

<style scoped lang="scss">
  .member-screen {
    --accent: #a96936;
    --accent-soft: #f7e5d9;
    --ink: #43250f;
    --muted: #745d4c;
    --panel: rgb(255 255 255 / 90%);

    position: relative;
    height: min(880px, calc(100dvh - 78px));
    min-height: 650px;
    overflow: auto;
    color: var(--ink);
    touch-action: pan-y;
    background: #faf0e5;
    outline: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    &.theme-silver {
      --accent: #2777ed;
      --accent-soft: #e3efff;
      --ink: #09234b;
      --muted: #526783;

      background: #e9f5ff;
    }

    &.theme-gold {
      --accent: #e6a20e;
      --accent-soft: #fff1d0;
      --ink: #663b0d;
      --muted: #766049;

      background: #fff3d9;
    }

    &.theme-platinum {
      --accent: #8248ee;
      --accent-soft: #eee6ff;
      --ink: #24124e;
      --muted: #655c7e;

      background: #f2edff;
    }

    &.theme-black {
      --accent: #f0c376;
      --accent-soft: #332b22;
      --ink: #ffe4ae;
      --muted: #f1dab6;
      --panel: rgb(26 24 23 / 84%);

      background: #171719;
    }
  }

  .scene-background,
  .scene-wash {
    position: absolute;
    inset: 0;
    min-height: 880px;
    pointer-events: none;
  }

  .scene-background {
    background-image: var(--scene-image);
    background-position: center top;
    background-size: cover;
    transition: background-image 250ms ease;
  }

  .scene-wash {
    background: linear-gradient(
      180deg,
      rgb(255 250 245 / 94%) 0%,
      rgb(255 250 245 / 87%) 22%,
      transparent 35%,
      transparent 68%,
      rgb(255 251 246 / 78%) 100%
    );
  }

  .theme-silver .scene-wash {
    background: linear-gradient(
      180deg,
      rgb(239 248 255 / 96%) 0%,
      rgb(239 248 255 / 88%) 22%,
      transparent 35%,
      transparent 70%,
      rgb(238 248 255 / 85%) 100%
    );
  }

  .theme-gold .scene-wash {
    background: linear-gradient(
      180deg,
      rgb(255 249 238 / 95%) 0%,
      rgb(255 249 238 / 86%) 22%,
      transparent 36%,
      transparent 71%,
      rgb(255 243 218 / 80%) 100%
    );
  }

  .theme-platinum .scene-wash {
    background: linear-gradient(
      180deg,
      rgb(244 240 255 / 96%) 0%,
      rgb(244 240 255 / 87%) 22%,
      transparent 35%,
      transparent 70%,
      rgb(239 234 255 / 82%) 100%
    );
  }

  .theme-black .scene-wash {
    background: linear-gradient(
      180deg,
      rgb(14 14 17 / 95%) 0%,
      rgb(14 14 17 / 91%) 22%,
      transparent 39%,
      transparent 72%,
      rgb(15 15 17 / 86%) 100%
    );
  }

  .screen-content {
    position: relative;
    z-index: 1;
    min-height: 880px;
  }

  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 47px;
    padding: 0 30px;
    font-size: 15px;
    font-weight: 800;
    color: #121217;
  }

  .theme-black .status-bar {
    color: #fff;
  }

  .status-icons {
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .signal {
    width: 14px;
    height: 13px;
    clip-path: polygon(
      0 80%,
      17% 80%,
      17% 55%,
      38% 55%,
      38% 35%,
      60% 35%,
      60% 15%,
      80% 15%,
      80% 0,
      100% 0,
      100% 100%,
      0 100%
    );
    background: currentcolor;
  }

  .wifi {
    width: 15px;
    height: 12px;
    border-top: 3px solid currentcolor;
    border-radius: 50%;
    transform: translateY(2px);
  }

  .battery {
    width: 20px;
    height: 10px;
    background: currentcolor;
    border: 2px solid currentcolor;
    border-radius: 3px;
    box-shadow: 3px 0 0 -1px currentcolor;
  }

  .screen-header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    height: 56px;
    padding: 0 23px;
    color: #15161c;
  }

  .theme-black .screen-header {
    color: #fff;
  }

  .screen-header > strong {
    font-size: 20px;
    font-weight: 800;
    white-space: nowrap;
  }

  .back-button,
  .rules-button,
  .tier-arrow,
  .tier-option,
  .upgrade-button,
  .rules-title button {
    font: inherit;
    cursor: pointer;
    border: 0;
  }

  .back-button {
    display: grid;
    place-items: center;
    width: 28px;
    height: 36px;
    padding: 0;
    font-size: 30px;
    color: inherit;
    background: transparent;
  }

  .rules-button {
    justify-self: end;
    padding: 5px 13px;
    font-size: 13px;
    color: inherit;
    white-space: nowrap;
    background: rgb(255 255 255 / 15%);
    border: 1px solid rgb(93 84 78 / 22%);
    border-radius: 30px;
  }

  .theme-black .rules-button {
    border-color: rgb(255 255 255 / 26%);
  }

  .tier-navigation {
    display: flex;
    align-items: center;
    height: 118px;
    padding: 4px 8px 12px;
    background: rgb(255 255 255 / 11%);
    border-bottom: 1px solid rgb(255 255 255 / 75%);
    border-radius: 0 0 50% 7%;
  }

  .tier-list {
    display: flex;
    flex: 1;
    justify-content: space-around;
    min-width: 0;
  }

  .tier-option {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 5px;
    align-items: center;
    min-width: 0;
    padding: 0 1px 9px;
    color: #687180;
    background: transparent;
  }

  .tier-option img {
    width: clamp(39px, 11vw, 54px);
    height: clamp(39px, 11vw, 54px);
    object-fit: cover;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
  }

  .tier-option span {
    max-width: 100%;
    overflow: hidden;
    font-size: clamp(10px, 3vw, 13px);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tier-option.active {
    font-weight: 800;
    color: var(--accent);
  }

  .tier-option.active img {
    box-shadow:
      0 0 0 3px var(--accent-soft),
      0 4px 13px rgb(0 0 0 / 12%);
    transform: scale(1.07);
  }

  .tier-option.active::after {
    position: absolute;
    bottom: 1px;
    width: 21px;
    height: 3px;
    content: '';
    background: var(--accent);
    border-radius: 5px;
  }

  .theme-black .tier-option {
    color: #c2bcb4;
  }

  .theme-black .tier-option.active {
    color: var(--accent);
  }

  .tier-arrow {
    display: grid;
    flex: 0 0 22px;
    place-items: center;
    width: 22px;
    height: 27px;
    padding: 0;
    font-size: 19px;
    color: var(--ink);
    background: rgb(255 255 255 / 56%);
    border-radius: 50%;
  }

  .tier-arrow:disabled {
    cursor: default;
    opacity: 0.3;
  }

  .level-main {
    padding: 38px 17px 30px;
  }

  .level-intro h1 {
    margin: 0;
    font-size: clamp(34px, 10vw, 47px);
    font-weight: 850;
    line-height: 1.2;
    letter-spacing: 1px;
  }

  .level-intro p {
    margin: 5px 0 0;
    font-size: clamp(15px, 4vw, 19px);
    color: var(--muted);
    letter-spacing: 1px;
  }

  .growth-block {
    margin-top: 33px;
  }

  .growth-copy {
    display: flex;
    gap: 5px;
    align-items: baseline;
    font-size: 14px;
    color: var(--muted);
  }

  .growth-copy strong {
    font-size: 18px;
    font-weight: 800;
    color: var(--ink);
  }

  .growth-track {
    width: min(190px, 55%);
    height: 11px;
    margin-top: 8px;
    overflow: hidden;
    background: rgb(255 255 255 / 72%);
    border-radius: 20px;
  }

  .growth-track span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent), white 40%));
    border-radius: inherit;
    transition: width 250ms ease;
  }

  .upgrade-button {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    min-width: 128px;
    height: 49px;
    padding: 0 23px;
    margin-top: 24px;
    font-size: 18px;
    color: #fff;
    background: #2d2928;
    border-radius: 32px;
    box-shadow: 0 8px 18px rgb(0 0 0 / 12%);
  }

  .upgrade-button .art-svg-icon {
    font-size: 21px;
  }

  .theme-black .upgrade-button {
    color: #2a2016;
    background: #ffdaa1;
  }

  .benefits-card {
    padding: 22px 16px 20px;
    margin-top: 112px;
    background: var(--panel);
    backdrop-filter: blur(12px);
    border: 1px solid rgb(255 255 255 / 70%);
    border-radius: 19px;
    box-shadow: 0 11px 28px rgb(91 68 50 / 9%);
  }

  .theme-black .benefits-card {
    border-color: rgb(255 218 156 / 46%);
    box-shadow: 0 0 18px rgb(239 179 88 / 18%);
  }

  .benefits-heading {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .benefits-crown {
    display: grid;
    flex: 0 0 42px;
    place-items: center;
    height: 42px;
    font-size: 31px;
    color: var(--accent);
  }

  .benefits-heading h2 {
    margin: 0;
    font-size: 21px;
    font-weight: 800;
    line-height: 1.2;
    color: var(--ink);
  }

  .benefits-heading p {
    margin: 3px 0 0;
    font-size: 13px;
    color: var(--muted);
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 3px;
    margin-top: 23px;
  }

  .benefit-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    text-align: center;
  }

  .benefit-icon {
    display: grid;
    place-items: center;
    width: clamp(42px, 12vw, 57px);
    height: clamp(42px, 12vw, 57px);
    font-size: 25px;
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: 50%;
  }

  .benefit-item strong {
    margin-top: 9px;
    font-size: clamp(10px, 2.7vw, 12px);
    line-height: 1.2;
    color: var(--ink);
    white-space: nowrap;
  }

  .benefit-item small {
    margin-top: 5px;
    font-size: clamp(10px, 2.7vw, 12px);
    color: var(--muted);
    white-space: nowrap;
  }

  .configured-benefits {
    padding-top: 12px;
    margin: 14px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
    border-top: 1px solid rgb(127 127 127 / 15%);
  }

  .rules-overlay {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    align-items: end;
    background: rgb(0 0 0 / 38%);
  }

  .rules-sheet {
    width: 100%;
    padding: 23px 23px 30px;
    color: #272936;
    background: #fff;
    border-radius: 24px 24px 0 0;
  }

  .rules-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .rules-title h2 {
    margin: 0;
    font-size: 20px;
  }

  .rules-title button {
    padding: 3px;
    font-size: 22px;
    color: #515562;
    background: transparent;
  }

  .rules-sheet p {
    font-size: 13px;
    color: #697180;
  }

  .rules-sheet ul {
    padding: 0;
    margin: 15px 0 0;
    list-style: none;
  }

  .rules-sheet li {
    display: flex;
    justify-content: space-between;
    padding: 9px 0;
    font-size: 14px;
    border-top: 1px solid #edf0f3;
  }

  .rules-sheet li strong {
    color: #685246;
  }

  @media (width <= 430px) {
    .member-screen {
      height: calc(100dvh - 40px);
      min-height: 0;
    }

    .screen-content,
    .scene-background,
    .scene-wash {
      min-height: max(810px, calc(100dvh - 40px));
    }

    .benefits-card {
      margin-top: clamp(85px, 13vh, 140px);
    }
  }
</style>
