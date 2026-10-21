<template>
  <div class="level-system-page">
    <section class="level-hero">
      <div class="hero-heading">
        <div>
          <h2>{{ platform ? '平台会员等级体系' : '会员等级体系' }}</h2>
          <p>{{ pageDescription }}</p>
        </div>
        <ElButton
          v-auth="'system:level:scheme-add'"
          type="primary"
          :icon="DocumentAdd"
          @click="newScheme"
        >
          {{ platform ? '新建模板' : '新建 / 引用方案' }}
        </ElButton>
      </div>

      <div class="hero-summary" :class="{ warning: !defaultTemplate }">
        <div class="summary-icon"
          ><ElIcon><InfoFilled /></ElIcon
        ></div>
        <div>
          <strong>{{ summaryTitle }}</strong>
          <p>{{ summaryDescription }}</p>
        </div>
      </div>

      <div class="hero-slogan">
        <span>让每一位顾客</span>
        <span>都有专属的会员体验</span>
      </div>
      <img :src="crownIllustration" alt="会员等级体系" class="hero-illustration" />
    </section>

    <section class="scheme-actions">
      <button type="button" class="scheme-action is-active">
        <span class="action-illustration mint">
          <img :src="activeIllustration" alt="平台默认体系" />
        </span>
        <span class="action-copy">
          <strong>{{ platform ? '平台默认体系' : '当前生效体系' }}</strong>
          <small>{{ defaultSchemeName }}</small>
        </span>
        <ElTag v-if="defaultTemplate || activeScheme" type="success" round>使用中</ElTag>
      </button>

      <button
        type="button"
        class="scheme-action blue"
        :disabled="!selected || readOnlyTemplate"
        @click="rename"
      >
        <span class="action-illustration blue"><img :src="editIllustration" alt="编辑方案" /></span>
        <span class="action-copy"
          ><strong>编辑方案</strong><small>自定义会员等级规则与方案说明</small></span
        >
        <ElIcon><ArrowRight /></ElIcon>
      </button>

      <button
        v-if="platform"
        type="button"
        class="scheme-action purple"
        :disabled="!selected || selected.status !== 1 || schemesLoading"
        @click="assignmentVisible = true"
      >
        <span class="action-illustration purple"
          ><img :src="assignIllustration" alt="分配给租户"
        /></span>
        <span class="action-copy"
          ><strong>分配给租户</strong><small>将该体系分配给指定租户使用</small></span
        >
        <ElIcon><ArrowRight /></ElIcon>
      </button>

      <button
        v-else
        type="button"
        class="scheme-action purple"
        :disabled="!defaultTemplate || schemesLoading"
        @click="useDefault"
      >
        <span class="action-illustration purple"
          ><img :src="assignIllustration" alt="采用默认体系"
        /></span>
        <span class="action-copy"
          ><strong>采用默认体系</strong><small>复制平台默认体系并独立维护</small></span
        >
        <ElIcon><ArrowRight /></ElIcon>
      </button>

      <button type="button" class="scheme-action orange" @click="newScheme">
        <span class="action-illustration orange"
          ><img :src="templateIllustration" alt="新建模板"
        /></span>
        <span class="action-copy"
          ><strong>{{ platform ? '新建模板' : '新建方案' }}</strong
          ><small>基于当前设置创建新等级体系</small></span
        >
        <ElIcon><ArrowRight /></ElIcon>
      </button>
    </section>

    <ElCard class="level-content-card" shadow="never">
      <div class="scheme-toolbar">
        <div class="scheme-selector">
          <span>当前体系</span>
          <ElSelect
            v-model="selectedId"
            :loading="schemesLoading"
            :disabled="schemeSaving || schemesLoading"
            placeholder="选择等级方案"
            @change="loadLevels"
          >
            <ElOption
              v-for="scheme in availableSchemes"
              :key="scheme.id"
              :value="String(scheme.id)"
              :label="getSchemeLabel(scheme)"
            />
          </ElSelect>
        </div>
        <div class="scheme-status-actions">
          <ElTag v-if="selected?.isActive === 1" type="success">当前启用</ElTag>
          <ElTag v-if="selected?.isDefault === 1" type="success">平台默认体系</ElTag>
          <ElTag v-if="readOnlyTemplate" type="info">平台体系 · 只读预览</ElTag>
          <ElButton
            v-auth="'system:level:scheme-add'"
            v-if="readOnlyTemplate"
            size="small"
            type="success"
            :loading="schemeSaving"
            :disabled="loading || schemesLoading"
            @click="useSelectedTemplate"
          >
            选用这套体系
          </ElButton>
          <ElButton
            v-auth="'system:level:scheme-activate'"
            v-if="selected && !platform && !readOnlyTemplate && selected.isActive !== 1"
            size="small"
            type="success"
            plain
            :loading="schemeSaving"
            @click="activate"
          >
            启用这套方案
          </ElButton>
          <ElButton
            v-if="selected && platform && selected.isDefault !== 1"
            size="small"
            type="success"
            plain
            :loading="schemeSaving"
            :disabled="loading || schemesLoading || selected.status !== 1"
            @click="makeDefault"
          >
            设为平台默认体系
          </ElButton>
          <ElButton
            v-auth="'system:level:scheme-delete'"
            v-if="
              selected && !readOnlyTemplate && selected.isActive !== 1 && selected.isDefault !== 1
            "
            size="small"
            type="danger"
            plain
            @click="removeScheme"
          >
            删除方案
          </ElButton>
        </div>
      </div>

      <p v-if="selected?.description" class="scheme-description">{{ selected.description }}</p>

      <div class="level-stats">
        <div class="stat-card blue">
          <span class="stat-icon"><ArtSvgIcon icon="ri:stack-fill" /></span>
          <div
            ><strong>{{ rows.length }}</strong
            ><span>会员等级数量</span></div
          >
        </div>
        <div class="stat-card green">
          <span class="stat-icon"><ArtSvgIcon icon="ri:user-star-fill" /></span>
          <div
            ><strong>{{ minimumExperience }}</strong
            ><span>最小升级经验</span></div
          >
        </div>
        <div class="stat-card orange">
          <span class="stat-icon"><ArtSvgIcon icon="ri:bar-chart-grouped-fill" /></span>
          <div
            ><strong>{{ maximumExperience }}</strong
            ><span>最高升级经验</span></div
          >
        </div>
        <div class="stat-card purple">
          <span class="stat-icon image"><img :src="giftIllustration" alt="权益类型" /></span>
          <div
            ><strong>{{ benefitCount }}</strong
            ><span>权益类型</span></div
          >
        </div>
      </div>

      <ArtSearchBar
        v-model="searchForm"
        class="level-search-bar"
        :items="searchItems"
        :span="8"
        :show-expand="false"
        :show-reset="false"
        :show-search="false"
      >
        <template #actions>
          <ElButton :icon="Refresh" :loading="schemesLoading" @click="loadSchemes()">刷新</ElButton>
          <ElButton
            v-auth="'system:level:add'"
            type="primary"
            :icon="Plus"
            :disabled="!selected || readOnlyTemplate || loading || schemesLoading"
            @click="editLevel()"
          >
            添加等级
          </ElButton>
        </template>
      </ArtSearchBar>

      <ArtTable
        :data="filtered"
        :loading="loading"
        row-key="id"
        class="levels-table"
        :columns="tableColumns"
      >
        <template #tableColumnsSlot2="{ row }">
          <span class="level-icon" :class="`level-${row.levelCode % 5}`">
            <ElImage v-if="isImage(row.icon)" :src="row.icon" />
            <ArtSvgIcon v-else :icon="row.icon || 'ri:vip-crown-2-fill'" />
          </span>
        </template>
        <template #tableColumnsSlot3="{ row }">
          <div class="level-name-cell">
            <div
              ><strong>{{ row.levelName }}</strong
              ><ElTag v-if="row.levelCode === 0" size="small" type="primary">初始等级</ElTag></div
            >
            <span>{{ row.description || '解锁更多会员专属体验' }}</span>
          </div>
        </template>
        <template #tableColumnsSlot5="{ row }">
          <div v-if="splitBenefits(row.benefits).length" class="benefit-list">
            <span v-for="benefit in splitBenefits(row.benefits)" :key="benefit">{{ benefit }}</span>
          </div>
          <span v-else class="empty-benefit">暂无权益</span>
        </template>
        <template #tableColumnsSlot6="{ row }">
          <ElTag :type="row.status === 1 ? 'success' : 'info'" round>{{
            row.status === 1 ? '启用' : '禁用'
          }}</ElTag>
        </template>
      </ArtTable>
    </ElCard>
    <ElDialog
      v-model="levelVisible"
      title="等级配置"
      width="min(560px,94vw)"
      align-center
      :close-on-click-modal="false"
      :show-close="!saving"
    >
      <ArtForm ref="formRef" :model="form" :rules="rules" label-width="110px">
        <ElFormItem label="等级名称" prop="levelName"
          ><ElInput v-model="form.levelName" maxlength="50"
        /></ElFormItem>
        <ElFormItem label="等级编码" prop="levelCode"
          ><ElInputNumber v-model="form.levelCode" :min="0" :max="2147483647" :precision="0"
        /></ElFormItem>
        <ElFormItem label="所需经验" prop="requiredExp"
          ><ElInputNumber v-model="form.requiredExp" :min="0" :max="2147483647" :precision="0"
        /></ElFormItem>
        <ElFormItem label="等级权益"
          ><ElInput v-model="form.benefits" type="textarea" maxlength="1000"
        /></ElFormItem>
        <ElFormItem label="描述"
          ><ElInput v-model="form.description" type="textarea" maxlength="500"
        /></ElFormItem>
        <ElFormItem label="图标"><ArtIconPicker v-model="form.icon" allow-image /></ElFormItem>
        <ElFormItem label="排序"
          ><ElInputNumber v-model="form.sort" :min="0" :precision="0"
        /></ElFormItem>
        <ElFormItem label="状态"
          ><ElSwitch
            v-model="form.status"
            :disabled="!hasAuth('system:level:status')"
            :active-value="1"
            :inactive-value="0"
        /></ElFormItem>
      </ArtForm>
      <template #footer
        ><ElButton :disabled="saving" @click="levelVisible = false">取消</ElButton
        ><ElButton type="primary" :loading="saving" @click="saveLevel">保存</ElButton></template
      >
    </ElDialog>
    <ElDialog
      v-model="schemeVisible"
      :title="renaming ? '编辑方案' : platform ? '新建模板' : '新建 / 引用等级方案'"
      width="min(560px,94vw)"
      align-center
      :close-on-click-modal="false"
      :show-close="!schemeSaving"
    >
      <ArtForm ref="schemeRef" :model="schemeForm" :rules="schemeRules" label-width="100px">
        <ElFormItem label="方案名称" prop="name"
          ><ElInput v-model="schemeForm.name" maxlength="80"
        /></ElFormItem>
        <ElFormItem label="方案说明"
          ><ElInput v-model="schemeForm.description" type="textarea" maxlength="500"
        /></ElFormItem>
        <ElFormItem v-if="!renaming" label="复制来源"
          ><ElSelect
            v-model="schemeForm.copyFromId"
            clearable
            filterable
            placeholder="不选则从普通会员开始"
            style="width: 100%"
            ><ElOptionGroup :label="platform ? '平台模板' : '可选平台体系'"
              ><ElOption
                v-for="item in templates"
                :key="item.id"
                :label="item.name + (item.isDefault === 1 ? '（平台默认）' : '')"
                :value="String(item.id)" /></ElOptionGroup
            ><ElOptionGroup v-if="!platform" label="商户已有方案"
              ><ElOption
                v-for="item in schemes"
                :key="item.id"
                :label="item.name"
                :value="String(item.id)" /></ElOptionGroup></ElSelect
        ></ElFormItem>
      </ArtForm>
      <template #footer
        ><ElButton :disabled="schemeSaving" @click="schemeVisible = false">取消</ElButton
        ><ElButton
          v-auth="'system:level:scheme-add'"
          type="primary"
          :loading="schemeSaving"
          @click="saveScheme"
          >保存方案</ElButton
        ></template
      >
    </ElDialog>
    <TemplateTenantsDialog
      v-if="platform && selected"
      v-model="assignmentVisible"
      :template="selected"
    />
  </div>
</template>
<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { useAuth } from '@/hooks/core/useAuth'
  const { hasAuth } = useAuth()
  import { computed, h, onMounted, reactive, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import {
    ArrowRight,
    DocumentAdd,
    InfoFilled,
    Plus,
    Refresh,
    Search
  } from '@element-plus/icons-vue'
  import { useUserStore } from '@/store/modules/user'
  import TemplateTenantsDialog from './modules/template-tenants-dialog.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import crownIllustration from '@/assets/images/system/level-crown.png'
  import giftIllustration from '@/assets/images/system/level-gift.png'
  import activeIllustration from '@/assets/images/system/level-active.png'
  import editIllustration from '@/assets/images/system/level-edit.png'
  import assignIllustration from '@/assets/images/system/level-assign.png'
  import templateIllustration from '@/assets/images/system/level-template.png'
  import {
    listLevelSchemes,
    listSchemeLevels,
    createLevelScheme,
    renameLevelScheme,
    activateLevelScheme,
    defaultLevelTemplate,
    useDefaultLevelTemplate,
    useLevelTemplate,
    deleteLevelScheme,
    saveMemberLevel,
    deleteMemberLevel,
    toggleMemberLevel,
    type LevelScheme,
    type MemberLevel
  } from '@/api/member-level'
  const session = useUserStore(),
    platform = computed(() => session.isSuperAdmin && !session.activeTenant)
  const schemes = ref<LevelScheme[]>([]),
    templates = ref<LevelScheme[]>([]),
    selectedId = ref('')
  const availableSchemes = computed(() =>
    platform.value ? schemes.value : [...schemes.value, ...templates.value]
  )
  const assignmentVisible = ref(false)
  const selected = computed(() =>
    availableSchemes.value.find((s) => String(s.id) === selectedId.value)
  )
  const readOnlyTemplate = computed(
    () => !platform.value && !!selected.value && selected.value.tenantId == null
  )
  const fetchLevelRows = (params: { schemeId?: string }) =>
    params.schemeId ? listSchemeLevels(params.schemeId) : Promise.resolve([] as MemberLevel[])
  const {
    data: rows,
    columns: tableColumns,
    loading,
    getData,
    replaceSearchParams,
    clearData,
    refreshCreate,
    refreshUpdate,
    refreshRemove,
    toggleColumn: toggleLevelColumn
  } = useTable({
    core: {
      apiFn: fetchLevelRows,
      immediate: false,
      columnsFactory: () => [
        { prop: 'levelCode', label: '等级编号', width: 100 },
        {
          prop: 'tableColumnsColumn2',
          label: '图标',
          width: 90,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot2'
        },
        {
          prop: 'tableColumnsColumn3',
          label: '等级名称',
          minWidth: 180,
          useSlot: true,
          slotName: 'tableColumnsSlot3'
        },
        { prop: 'requiredExp', label: '升级所需经验', minWidth: 150, sortable: true },
        {
          prop: 'tableColumnsColumn5',
          label: '等级权益',
          minWidth: 240,
          useSlot: true,
          slotName: 'tableColumnsSlot5'
        },
        {
          prop: 'tableColumnsColumn6',
          label: '状态',
          width: 100,
          align: 'center',
          useSlot: true,
          slotName: 'tableColumnsSlot6'
        },
        {
          prop: 'operation',
          label: '操作',
          width: 150,
          fixed: 'right',
          align: 'center',
          formatter: (row: MemberLevel) =>
            h('div', { class: 'flex items-center justify-center' }, [
              h(ArtButtonTable, {
                auth: 'system:level:edit',
                type: 'edit',
                label: '编辑等级',
                onClick: () => editLevel(row)
              }),
              h(ArtButtonTable, {
                auth: 'system:level:status',
                icon: row.status === 1 ? 'ri:forbid-line' : 'ri:checkbox-circle-line',
                iconClass:
                  row.status === 1 ? 'bg-warning/12 text-warning' : 'bg-success/12 text-success',
                label: row.status === 1 ? '禁用等级' : '启用等级',
                onClick: () => toggle(row)
              }),
              h(ArtButtonTable, {
                auth: 'system:level:delete',
                type: 'delete',
                label: '删除等级',
                onClick: () => remove(row)
              })
            ])
        }
      ]
    }
  })
  const defaultTemplate = computed(() =>
    templates.value.find((s) => s.isDefault === 1 && s.status === 1)
  )
  const activeScheme = computed(() => schemes.value.find((s) => s.isActive === 1 && s.status === 1))
  const searchForm = ref({ keyword: '' })
  const searchItems = computed(() => [
    {
      label: '',
      key: 'keyword',
      type: 'input',
      span: 8,
      props: {
        placeholder: '搜索等级名称、权益关键词',
        clearable: true,
        prefixIcon: Search
      }
    }
  ])
  const filtered = computed(() => {
    const keyword = searchForm.value.keyword.trim().toLocaleLowerCase()
    if (!keyword) return rows.value
    return rows.value.filter((row) =>
      `${row.levelName} ${row.benefits || ''} ${row.description || ''}`
        .toLocaleLowerCase()
        .includes(keyword)
    )
  })
  const pageDescription = computed(() =>
    platform.value
      ? '平台默认体系供所有租户使用；其他体系可分配给指定租户，由租户自行选择。'
      : '选择适合门店的会员等级体系，会员经验、余额和积分在切换后仍会保留。'
  )
  const summaryTitle = computed(() =>
    platform.value
      ? `平台默认体系：${defaultTemplate.value?.name || '尚未设置'}`
      : `当前生效体系：${activeScheme.value?.name || defaultTemplate.value?.name || '尚未设置'}`
  )
  const summaryDescription = computed(() => {
    if (platform.value) {
      return defaultTemplate.value
        ? '选择其他体系后可将其设为平台默认，切换不会覆盖租户已启用的独立方案。'
        : '请先新建体系并添加等级，再设为平台默认，完成后才能创建新租户。'
    }
    return activeScheme.value
      ? '当前使用商户独立体系，可继续调整等级规则和会员权益。'
      : '当前按平台默认体系计算会员等级，复制后可作为门店独立方案维护。'
  })
  const defaultSchemeName = computed(() =>
    platform.value
      ? defaultTemplate.value?.name || '尚未设置默认体系'
      : activeScheme.value?.name || defaultTemplate.value?.name || '尚未启用体系'
  )
  const minimumExperience = computed(() =>
    rows.value.length ? Math.min(...rows.value.map((row) => Number(row.requiredExp || 0))) : 0
  )
  const maximumExperience = computed(() =>
    rows.value.length ? Math.max(...rows.value.map((row) => Number(row.requiredExp || 0))) : 0
  )
  const splitBenefits = (benefits?: string): string[] =>
    benefits
      ? benefits
          .split(/[，,、;；\n]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      : []
  const benefitCount = computed(
    () => new Set(rows.value.flatMap((row) => splitBenefits(row.benefits))).size
  )
  const getSchemeLabel = (scheme: LevelScheme): string =>
    scheme.name +
    (scheme.isActive === 1
      ? '（当前启用）'
      : scheme.isDefault === 1
        ? '（平台默认）'
        : !platform.value && scheme.tenantId == null
          ? '（平台分配）'
          : '')
  const schemesLoading = ref(false),
    saving = ref(false),
    schemeSaving = ref(false),
    levelVisible = ref(false),
    schemeVisible = ref(false),
    renaming = ref(false)
  const formRef = ref<FormInstance>(),
    schemeRef = ref<FormInstance>()
  const defaults = (): MemberLevel => ({
    schemeId: selectedId.value,
    levelCode: Math.max(-1, ...rows.value.map((r) => r.levelCode)) + 1,
    levelName: '',
    requiredExp: 0,
    icon: '',
    benefits: '',
    description: '',
    sort: 0,
    status: 1
  })
  const form = reactive<MemberLevel>(defaults()),
    schemeForm = reactive({ name: '', description: '', copyFromId: '' })
  const rules: FormRules = {
    levelName: [{ required: true, message: '请输入等级名称' }],
    levelCode: [{ required: true, message: '请输入等级编码' }],
    requiredExp: [{ required: true, message: '请输入经验值' }]
  }
  const schemeRules: FormRules = { name: [{ required: true, message: '请输入方案名称' }] }
  const isImage = (icon?: string) => !!icon && /^(https?:\/\/|\/images\/)/.test(icon)
  async function loadLevels() {
    if (!selectedId.value) return clearData()
    replaceSearchParams({ schemeId: selectedId.value })
    await getData()
  }
  async function loadSchemes(prefer?: string) {
    if (schemesLoading.value) return
    schemesLoading.value = true
    try {
      const result = await listLevelSchemes()
      schemes.value = result.schemes
      templates.value = result.templates
      selectedId.value =
        prefer ||
        (availableSchemes.value.some((s) => String(s.id) === selectedId.value)
          ? selectedId.value
          : String(
              (platform.value ? defaultTemplate.value : activeScheme.value || defaultTemplate.value)
                ?.id ||
                availableSchemes.value[0]?.id ||
                ''
            ))
      await loadLevels()
    } finally {
      schemesLoading.value = false
    }
  }
  function editLevel(row?: MemberLevel) {
    Object.keys(form).forEach((key) => delete (form as any)[key])
    Object.assign(form, defaults(), row || {})
    levelVisible.value = true
  }
  async function saveLevel() {
    if (saving.value || !(await formRef.value?.validate().catch(() => false))) return
    saving.value = true
    try {
      const editing = !!form.id
      await saveMemberLevel({ ...form })
      levelVisible.value = false
      ElMessage.success('等级已保存')
      await (editing ? refreshUpdate() : refreshCreate())
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    } finally {
      saving.value = false
    }
  }
  function newScheme() {
    renaming.value = false
    Object.assign(schemeForm, {
      name: '',
      description: '',
      copyFromId: !platform.value && defaultTemplate.value ? String(defaultTemplate.value.id) : ''
    })
    schemeVisible.value = true
  }
  function rename() {
    if (!selected.value) return
    renaming.value = true
    Object.assign(schemeForm, {
      name: selected.value.name,
      description: selected.value.description || '',
      copyFromId: ''
    })
    schemeVisible.value = true
  }
  async function saveScheme() {
    if (schemeSaving.value || !(await schemeRef.value?.validate().catch(() => false))) return
    schemeSaving.value = true
    try {
      let id = selectedId.value
      if (renaming.value) await renameLevelScheme(id, schemeForm)
      else {
        const created = await createLevelScheme({
          ...schemeForm,
          copyFromId: schemeForm.copyFromId || undefined
        })
        id = String(created.id)
      }
      schemeVisible.value = false
      ElMessage.success('方案已保存')
      await loadSchemes(id)
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    } finally {
      schemeSaving.value = false
    }
  }
  async function activate() {
    if (!selected.value || schemeSaving.value) return
    try {
      await ElMessageBox.confirm(
        '启用“' + selected.value.name + '”后，将按每位会员现有经验重新计算等级。确认启用？',
        '切换会员等级方案'
      )
      schemeSaving.value = true
      await activateLevelScheme(selectedId.value)
      ElMessage.success('方案已启用')
      await loadSchemes()
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    } finally {
      schemeSaving.value = false
    }
  }
  async function makeDefault() {
    if (schemeSaving.value || !selected.value) return
    const id = selectedId.value
    try {
      await ElMessageBox.confirm(
        '将“' +
          selected.value.name +
          '”设为平台默认体系？新租户及尚未设置启用体系的租户将使用它，已启用的租户方案保持独立。',
        '设置平台默认体系'
      )
      schemeSaving.value = true
      await defaultLevelTemplate(id)
      ElMessage.success('平台默认等级体系已更新')
      await loadSchemes()
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    } finally {
      schemeSaving.value = false
    }
  }
  async function useDefault() {
    if (schemeSaving.value || !defaultTemplate.value) return
    try {
      await ElMessageBox.confirm(
        '将复制当前平台默认体系并启用，会员等级按现有经验重新计算；原方案会保留。确认采用？',
        '采用平台默认体系'
      )
      schemeSaving.value = true
      const scheme = await useDefaultLevelTemplate()
      ElMessage.success('已复制并启用平台默认体系')
      await loadSchemes(String(scheme.id))
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    } finally {
      schemeSaving.value = false
    }
  }
  async function useSelectedTemplate() {
    if (schemeSaving.value || !selected.value || !readOnlyTemplate.value) return
    const template = selected.value
    try {
      await ElMessageBox.confirm(
        '选用“' +
          template.name +
          '”后，将复制为商户独立方案并启用，按会员现有经验重新计算等级。原方案保留。',
        '选用等级体系'
      )
      schemeSaving.value = true
      const scheme = await useLevelTemplate(template.id)
      ElMessage.success('已选用该等级体系')
      await loadSchemes(String(scheme.id))
    } catch {
      // API reports failures; cancellation preserves the active scheme.
    } finally {
      schemeSaving.value = false
    }
  }
  async function removeScheme() {
    try {
      await ElMessageBox.confirm('确认删除该方案及其等级？', '删除等级方案')
      await deleteLevelScheme(selectedId.value)
      selectedId.value = ''
      await loadSchemes()
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    }
  }
  async function toggle(row: MemberLevel) {
    try {
      await ElMessageBox.confirm('变更当前方案时会按原经验重新计算会员等级。确认变更？', '等级状态')
      await toggleMemberLevel(row.id!)
      await refreshUpdate()
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    }
  }
  async function remove(row: MemberLevel) {
    try {
      await ElMessageBox.confirm(
        '确认删除该等级？当前方案内会员将按原经验匹配其余等级。',
        '删除等级'
      )
      await deleteMemberLevel(row.id!)
      await refreshRemove()
    } catch {
      // Request errors are reported centrally; cancelling a confirmation keeps the current state.
    }
  }
  onMounted(() => loadSchemes())

  watch(readOnlyTemplate, (readOnly) => toggleLevelColumn?.('operation', !readOnly), {
    immediate: true
  })
</script>
<style scoped lang="scss">
  .level-system-page {
    --level-primary: #2f6df6;
    --level-title: #13213f;
    --level-muted: #667794;

    min-height: 100%;
  }

  .level-hero {
    position: relative;
    min-height: 188px;
    padding: 24px 28px 20px;
    overflow: hidden;
    background:
      radial-gradient(circle at 84% 12%, rgb(88 142 255 / 16%), transparent 28%),
      linear-gradient(120deg, #fff 0%, #f7faff 58%, #edf4ff 100%);
    border: 1px solid #e1e9f7;
    border-radius: 14px;
  }

  .hero-heading {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 24px;
    align-items: flex-start;
    justify-content: space-between;

    > div {
      max-width: 72%;
    }

    h2 {
      margin: 0;
      font-size: 25px;
      font-weight: 750;
      line-height: 38px;
      color: var(--level-title);
      letter-spacing: 0.5px;
    }

    p {
      margin: 7px 0 0;
      font-size: 13px;
      line-height: 1.7;
      color: var(--level-muted);
    }

    .el-button {
      min-width: 116px;
      height: 40px;
      box-shadow: 0 8px 18px rgb(47 109 246 / 18%);
    }
  }

  .hero-summary {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 13px;
    align-items: center;
    width: min(66%, 550px);
    padding: 10px 12px;
    margin-top: 8px;
    background: linear-gradient(90deg, #edf4ff, rgb(240 246 255 / 82%));
    border: 1px solid #dce8fc;
    border-radius: 10px;

    &.warning {
      background: linear-gradient(90deg, #fff7e8, #fffaf3);
      border-color: #f5e2ba;

      .summary-icon {
        background: #f4a126;
      }
    }

    .summary-icon {
      display: grid;
      flex: 0 0 auto;
      place-items: center;
      width: 34px;
      height: 34px;
      font-size: 19px;
      color: #fff;
      background: var(--level-primary);
      border-radius: 50%;
    }

    strong {
      font-size: 14px;
      color: #274576;
    }

    p {
      margin: 4px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: #7283a0;
    }
  }

  .hero-illustration {
    position: absolute;
    right: 30px;
    bottom: -25px;
    z-index: 1;
    width: 170px;
    height: 180px;
    pointer-events: none;
    object-fit: contain;
  }

  .hero-slogan {
    position: absolute;
    right: 250px;
    bottom: 34px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 13px;
    line-height: 1.4;
    color: #91a6cf;
    letter-spacing: 4px;
    transform: rotate(-8deg);
  }

  .scheme-actions {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin: 14px 0;
  }

  .scheme-action {
    display: flex;
    gap: 13px;
    align-items: center;
    min-width: 0;
    min-height: 80px;
    padding: 14px 16px;
    font: inherit;
    text-align: left;
    cursor: pointer;
    background: linear-gradient(135deg, #fff, #fbfdff);
    border: 1px solid #dbe6f7;
    border-radius: 11px;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;

    &:hover:not(:disabled) {
      border-color: #a9c5f8;
      box-shadow: 0 10px 24px rgb(43 91 170 / 10%);
      transform: translateY(-2px);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    &.is-active {
      cursor: default;
      background: linear-gradient(135deg, #f5fffc, #fbfffe);
      border-color: #b8ecdf;
    }

    &.purple {
      background: linear-gradient(135deg, #fff, #faf8ff);
      border-color: #e5dcfb;
    }

    &.orange {
      background: linear-gradient(135deg, #fff, #fff9f4);
      border-color: #f4dfca;
    }

    > .el-icon {
      flex: 0 0 auto;
      margin-left: auto;
      font-size: 17px;
      color: #6f83a4;
    }
  }

  .action-illustration {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 54px;
    height: 54px;
    overflow: hidden;
    background: #e6f9f3;
    border-radius: 11px;

    &.blue {
      background: #eaf3ff;
    }

    &.purple {
      background: #f0eaff;
    }

    &.orange {
      background: #fff0e2;
    }

    img {
      width: 64px;
      height: 64px;
      object-fit: contain;
    }
  }

  .action-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 5px;
    min-width: 0;

    strong {
      overflow: hidden;
      font-size: 15px;
      font-weight: 700;
      color: #1b2b49;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      overflow: hidden;
      font-size: 12px;
      color: #7585a0;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .level-content-card {
    border-color: #e4eaf3;
    border-radius: 13px;

    :deep(.el-card__body) {
      padding: 16px;
    }
  }

  .scheme-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .scheme-selector {
    display: flex;
    gap: 12px;
    align-items: center;

    > span {
      font-size: 14px;
      font-weight: 600;
      color: #3b4b68;
      white-space: nowrap;
    }

    .el-select {
      width: min(340px, 48vw);
    }
  }

  .scheme-status-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .scheme-description {
    padding: 9px 12px;
    margin: 12px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: #6f809b;
    background: #f7f9fc;
    border-radius: 7px;
  }

  .level-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 14px;
  }

  .stat-card {
    display: flex;
    gap: 13px;
    align-items: center;
    min-height: 76px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f9fbff, #f2f7ff);
    border-radius: 10px;

    &.green {
      background: linear-gradient(135deg, #f8fffd, #edfbf7);
    }

    &.orange {
      background: linear-gradient(135deg, #fffaf6, #fff2e7);
    }

    &.purple {
      background: linear-gradient(135deg, #fbfaff, #f2efff);
    }

    .stat-icon {
      display: grid;
      flex: 0 0 auto;
      place-items: center;
      width: 48px;
      height: 48px;
      font-size: 25px;
      color: #3581ee;
      background: #e4f0ff;
      border-radius: 50%;

      &.image img {
        width: 54px;
        height: 54px;
        object-fit: contain;
      }
    }

    &.green .stat-icon {
      color: #11b987;
      background: #dff9f1;
    }

    &.orange .stat-icon {
      color: #e98729;
      background: #ffead9;
    }

    &.purple .stat-icon {
      overflow: hidden;
      color: #7654ee;
      background: #ebe5ff;
    }

    > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      strong {
        font-size: 20px;
        color: #172541;
      }

      span {
        font-size: 12px;
        color: #75849d;
      }
    }
  }

  .level-search-bar {
    margin-top: 14px;

    :deep(.art-search-bar) {
      padding: 12px 14px 0;
      background: #f7f9fc;
      border: 1px solid #edf1f6;
      box-shadow: none;
    }

    :deep(.el-form-item) {
      margin-bottom: 12px;
    }

    :deep(.form-buttons) {
      margin-left: auto;
    }
  }

  .levels-table {
    margin-top: 12px;

    :deep(.el-table__header th) {
      height: 44px;
      font-weight: 600;
      color: #51617e;
      background: #f4f7fb;
    }

    :deep(.el-table__row td) {
      padding: 10px 0;
    }
  }

  .level-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    margin: 0 auto;
    overflow: hidden;
    font-size: 27px;
    color: #8496b5;
    background: linear-gradient(145deg, #f1f4f8, #e5eaf1);
    border-radius: 10px;

    &.level-1 {
      color: #7192bf;
      background: #e9f1fa;
    }

    &.level-2 {
      color: #e3a53b;
      background: #fff3dc;
    }

    &.level-3 {
      color: #4b607d;
      background: #e9edf3;
    }

    &.level-4 {
      color: #7958e7;
      background: #eee9ff;
    }

    :deep(.el-image),
    :deep(.el-image__inner) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .level-name-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;

    > div {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    strong {
      font-size: 14px;
      color: #20304d;
    }

    > span {
      overflow: hidden;
      font-size: 12px;
      color: #8490a5;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .benefit-list {
    display: flex;
    flex-direction: column;
    gap: 2px;

    span {
      overflow: hidden;
      font-size: 12px;
      line-height: 19px;
      color: #556886;
      text-overflow: ellipsis;
      white-space: nowrap;

      &::before {
        margin-right: 8px;
        color: #5d80bb;
        content: '•';
      }
    }
  }

  .empty-benefit {
    font-size: 12px;
    color: #a3adbd;
  }

  @media (width <= 1100px) {
    .scheme-actions,
    .level-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hero-slogan {
      display: none;
    }
  }

  @media (width <= 760px) {
    .level-system-page {
      padding: 10px;
    }

    .level-hero {
      min-height: 210px;
      padding: 18px;
    }

    .hero-heading {
      > div {
        max-width: 100%;
      }

      h2 {
        font-size: 23px;
      }

      .el-button {
        display: none;
      }
    }

    .hero-summary {
      width: 100%;
      margin-top: 8px;
    }

    .hero-illustration {
      right: -28px;
      bottom: -68px;
      width: 180px;
      opacity: 0.35;
    }

    .scheme-actions,
    .level-stats {
      grid-template-columns: 1fr;
    }

    .scheme-action {
      min-height: 80px;
    }

    .scheme-toolbar {
      align-items: stretch;
    }

    .scheme-selector {
      width: 100%;

      .el-select {
        flex: 1;
        width: auto;
      }
    }

    .level-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
