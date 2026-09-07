<template>
  <div :class="['art-icon-picker', { 'art-icon-picker--browse': browse }]">
    <ElButton v-if="browse" :disabled="disabled" @click="visible = true">
      <ArtSvgIcon icon="ri:apps-line" class="mr-1.5" />图标库
    </ElButton>
    <ElInput
      v-else
      v-model="value"
      clearable
      :disabled="disabled"
      :placeholder="allowImage ? '选择图标或填写图片 URL' : '选择图标或填写 Iconify 名称'"
    >
      <template #prepend
        ><ArtSvgIcon v-if="value && !isImage" :icon="value" /><ElImage
          v-else-if="isImage"
          :src="value"
          style="width: 20px; height: 20px" /><ArtSvgIcon v-else icon="ri:image-line"
      /></template>
      <template #append
        ><ElButton :disabled="disabled" @click="visible = true">图标库</ElButton></template
      >
    </ElInput>
    <ElDialog
      v-model="visible"
      title="图标库"
      width="min(760px, calc(100vw - 32px))"
      append-to-body
      align-center
    >
      <div class="icon-library-intro">
        <span>{{
          browse
            ? '选择图标，复制名称后可用于菜单、分类和会员等级。'
            : '点击图标即可填入，保存表单后生效。'
        }}</span>
        <ElTag type="info" effect="plain" size="small">{{ filtered.length }} 个图标</ElTag>
      </div>
      <ElRadioGroup v-model="scope" class="icon-scope" aria-label="图标范围">
        <ElRadioButton value="all">全部图标（{{ allIcons.length }}）</ElRadioButton>
        <ElRadioButton value="color">彩色图标（{{ colorIcons.length }}）</ElRadioButton>
        <ElRadioButton value="common">我的常用（{{ favorites.length }}）</ElRadioButton>
      </ElRadioGroup>
      <div class="icon-filters">
        <ElInput v-model="keyword" placeholder="中文搜索，如 蛋糕、门店、打印机" clearable>
          <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
        </ElInput>
        <ElSelect
          v-if="scope !== 'color'"
          v-model="category"
          class="icon-categories"
          placeholder="全部分类"
          aria-label="图标分类"
          clearable
        >
          <ElOption v-for="item in iconCategories" :key="item" :value="item" :label="item" />
        </ElSelect>
      </div>
      <p class="icon-hint">点星标加入常用，收藏保存在当前账号的本浏览器中。</p>
      <ElScrollbar ref="scrollbar" class="icon-results" max-height="360px">
        <div class="icon-grid">
          <div v-for="item in pagedIcons" :key="item.icon" class="icon-card">
            <button
              type="button"
              :class="['icon-option', { 'is-selected': value === item.icon }]"
              :title="item.label + '\n' + item.icon"
              :aria-label="item.label + ' ' + item.icon"
              :aria-pressed="value === item.icon"
              @click="select(item.icon)"
              ><ArtSvgIcon :icon="item.icon" /><span>{{ item.label }}</span></button
            >
            <button
              type="button"
              :class="['icon-favorite', { 'is-favorite': favoriteNames.has(item.icon) }]"
              :aria-label="
                (favoriteNames.has(item.icon) ? '移出常用：' : '加入常用：') + item.label
              "
              :title="favoriteNames.has(item.icon) ? '移出常用' : '加入常用'"
              :aria-pressed="favoriteNames.has(item.icon)"
              @click="toggleFavorite(item.icon)"
              ><ArtSvgIcon :icon="favoriteNames.has(item.icon) ? 'ri:star-fill' : 'ri:star-line'"
            /></button>
          </div>
        </div>
        <ElEmpty
          v-if="!filtered.length"
          :description="
            scope === 'common' && !favorites.length
              ? '还没有常用图标，去全部图标点星标添加吧'
              : '没有匹配的图标'
          "
        />
      </ElScrollbar>
      <div class="icon-pagination">
        <span v-if="filtered.length">支持中文和英文搜索 · 共 {{ filtered.length }} 个</span>
        <ElButton v-else-if="scope !== 'all'" link type="primary" @click="scope = 'all'"
          >在全部图标中搜索</ElButton
        >
        <ElPagination
          v-if="filtered.length > pageSize"
          v-model:current-page="page"
          :page-size="pageSize"
          :total="filtered.length"
          :pager-count="5"
          layout="prev, pager, next"
          size="small"
        />
      </div>
      <template #footer>
        <div v-if="browse && value" class="icon-copy">
          <ArtSvgIcon :icon="value" />
          <ElInput :model-value="value" readonly aria-label="所选图标名称" />
          <ElButton type="primary" @click="copyName">复制名称</ElButton>
        </div>
        <div class="icon-library-footer">
          <span
            >图标来源：<ElLink
              href="https://remixicon.com"
              target="_blank"
              rel="noopener noreferrer"
              :underline="false"
              >Remix Icon</ElLink
            ><span class="icon-provider"> / </span
            ><ElLink
              href="https://github.com/icons8/flat-color-icons"
              target="_blank"
              rel="noopener noreferrer"
              :underline="false"
              >Icons8 彩色</ElLink
            ><span class="icon-provider"> · Iconify</span></span
          >
          <ElButton @click="visible = false">关闭</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useClipboard, useStorage } from '@vueuse/core'
  import { ElMessage, type ScrollbarInstance } from 'element-plus'
  import {
    allIcons,
    colorIcons,
    iconLibrary,
    iconCategories,
    iconsByName
  } from '@/config/icon-library'
  import { useUserStore } from '@/store/modules/user'
  defineOptions({ name: 'ArtIconPicker' })
  const props = defineProps<{ disabled?: boolean; allowImage?: boolean; browse?: boolean }>()
  const { copy } = useClipboard({ legacy: true })
  const value = defineModel<string>({ default: '' })
  const scope = ref<'all' | 'color' | 'common'>('all')
  const session = useUserStore()
  const defaultFavorites = iconLibrary.map((item) => item.icon)
  const savedFavorites = useStorage<string[]>(
    computed(() => `liteshop:icon-favorites:v1:${session.info.userId || 'guest'}`),
    defaultFavorites,
    undefined,
    {
      serializer: {
        read(raw) {
          try {
            const items: unknown = JSON.parse(raw)
            return Array.isArray(items)
              ? [
                  ...new Set(
                    items.filter(
                      (item): item is string => typeof item === 'string' && iconsByName.has(item)
                    )
                  )
                ]
              : [...defaultFavorites]
          } catch {
            return [...defaultFavorites]
          }
        },
        write: JSON.stringify
      },
      onError: () => ElMessage.warning('浏览器未能保存收藏，下次打开可能需要重新添加')
    }
  )
  const favoriteNames = computed(() => new Set(savedFavorites.value))
  const favorites = computed(() =>
    savedFavorites.value.flatMap((icon) => {
      const item = iconsByName.get(icon)
      return item ? [item] : []
    })
  )
  const page = ref(1)
  const pageSize = 60
  const scrollbar = ref<ScrollbarInstance>()
  const visible = ref(false),
    keyword = ref(''),
    category = ref('')
  const isImage = computed(() => /^(https?:\/\/|\/images\/)/.test(value.value))
  const filtered = computed(() =>
    (scope.value === 'common'
      ? favorites.value
      : scope.value === 'color'
      ? colorIcons
      : allIcons
    ).filter(
      (item) =>
        (scope.value === 'color' || !category.value || item.category === category.value) &&
        keyword.value
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .every((term) =>
            `${item.label} ${item.icon} ${item.keywords} ${item.category}`
              .toLowerCase()
              .includes(term)
          )
    )
  )
  const pagedIcons = computed(() =>
    filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize)
  )
  watch([scope, keyword, category], () => {
    page.value = 1
  })
  watch(scope, () => {
    category.value = ''
  })
  watch(
    () => filtered.value.length,
    (count) => {
      page.value = Math.min(page.value, Math.max(1, Math.ceil(count / pageSize)))
    }
  )
  watch([page, scope, keyword, category], () => scrollbar.value?.setScrollTop(0), { flush: 'post' })
  function toggleFavorite(icon: string) {
    savedFavorites.value = favoriteNames.value.has(icon)
      ? savedFavorites.value.filter((item) => item !== icon)
      : [...savedFavorites.value, icon]
  }
  function select(icon: string) {
    value.value = icon
    if (!props.browse) visible.value = false
  }
  async function copyName() {
    try {
      await copy(value.value)
      ElMessage.success('图标名称已复制')
    } catch {
      ElMessage.warning('复制失败，请在输入框中手动复制图标名称')
    }
  }
</script>
<style scoped>
  .art-icon-picker {
    width: 100%;
  }

  .art-icon-picker--browse {
    display: inline-flex;
    align-items: center;
    width: auto;
    vertical-align: middle;
  }

  .icon-library-intro,
  .icon-library-footer,
  .icon-copy {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .icon-library-intro {
    flex-wrap: wrap;
    margin-bottom: 16px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .icon-library-footer {
    flex-wrap: wrap;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .icon-library-footer .el-link {
    font-size: 12px;
  }

  .icon-provider {
    color: var(--el-text-color-placeholder);
  }

  .icon-copy {
    padding: 12px;
    margin-bottom: 16px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .icon-copy > :deep(svg) {
    flex-shrink: 0;
    font-size: 24px;
  }

  .icon-filters {
    display: flex;
    gap: 12px;
  }

  .icon-categories {
    flex-shrink: 0;
    width: 140px;
  }

  .icon-hint {
    margin: 12px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .icon-scope {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .icon-results {
    margin-top: 16px;
  }

  .icon-pagination {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    margin-top: 14px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .icon-pagination .el-pagination {
    margin-left: auto;
  }

  .icon-option span {
    display: -webkit-box;
    max-width: 100%;
    padding: 0 6px;
    overflow: hidden;
    line-height: 1.4;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 10px;
    padding: 2px;
  }

  .icon-option {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 106px;
    padding-top: 16px;
    margin: 0;
    font-size: 12px;
    line-height: 1.25;
    color: var(--el-text-color-regular);
    cursor: pointer;
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  }

  .icon-option:hover,
  .icon-option.is-selected {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }

  .icon-option:focus-visible,
  .icon-favorite:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  .icon-option :deep(svg) {
    flex-shrink: 0;
    font-size: 28px;
  }

  .icon-card {
    position: relative;
    min-width: 0;
  }

  .icon-favorite {
    position: absolute;
    top: 3px;
    right: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    color: var(--el-text-color-placeholder);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 5px;
  }

  .icon-favorite :deep(svg) {
    font-size: 16px;
  }

  .icon-favorite:hover {
    background: var(--el-fill-color);
  }

  .icon-favorite.is-favorite {
    color: var(--el-color-warning);
  }

  @media (width <= 540px) {
    .icon-filters {
      flex-wrap: wrap;
    }

    .icon-categories {
      width: 100%;
    }

    .icon-scope :deep(.el-radio-button__inner) {
      padding: 8px;
      font-size: 12px;
    }
  }
</style>
