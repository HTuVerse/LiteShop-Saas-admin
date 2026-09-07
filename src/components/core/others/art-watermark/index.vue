<!-- 水印组件 -->
<template>
  <div
    v-if="website.watermarkEnabled && !site.watermarkHidden"
    class="website-watermark fixed left-0 top-0 h-screen w-screen pointer-events-none"
    :style="{ zIndex: zIndex }"
  >
    <ElWatermark
      :content="watermarkContent"
      :font="{ fontSize: fontSize, color: fontColor }"
      :rotate="rotate"
      :gap="[gapX, gapY]"
      :offset="[offsetX, offsetY]"
    >
      <div style="height: 100vh"></div>
    </ElWatermark>
  </div>
</template>

<script setup lang="ts">
  import { website } from '@/config/website'
  import { useWebsiteStore } from '@/store/modules/website'
  import { useUserStore } from '@/store/modules/user'
  import { computed, ref, onUnmounted } from 'vue'

  defineOptions({ name: 'ArtWatermark' })

  const site = useWebsiteStore()
  const user = useUserStore()
  const now = ref(new Date().toLocaleString())
  const timer = setInterval(() => {
    now.value = new Date().toLocaleString()
  }, 60_000)
  onUnmounted(() => clearInterval(timer))
  const watermarkContent = computed(() => {
    const name = user.info.userName || website.systemName
    if (website.watermarkMode === 'system') return website.systemName
    if (website.watermarkMode === 'custom') return website.watermarkText
    if (website.watermarkMode === 'username_time') return [name, now.value]
    return name
  })

  interface WatermarkProps {
    /** 水印内容 */
    content?: string
    /** 水印是否可见 */
    visible?: boolean
    /** 水印字体大小 */
    fontSize?: number
    /** 水印字体颜色 */
    fontColor?: string
    /** 水印旋转角度 */
    rotate?: number
    /** 水印间距X */
    gapX?: number
    /** 水印间距Y */
    gapY?: number
    /** 水印偏移X */
    offsetX?: number
    /** 水印偏移Y */
    offsetY?: number
    /** 水印层级 */
    zIndex?: number
  }

  withDefaults(defineProps<WatermarkProps>(), {
    content: '',
    visible: false,
    fontSize: 16,
    fontColor: 'rgba(128, 128, 128, 0.2)',
    rotate: -22,
    gapX: 100,
    gapY: 100,
    offsetX: 50,
    offsetY: 50,
    zIndex: 3100
  })
</script>
