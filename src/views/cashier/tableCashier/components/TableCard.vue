<template>
  <article class="table-card" :class="statusClass">
    <div class="card-content">
      <div class="status-badge">
        <span class="status-dot"></span>
        {{ displayStatus }}
      </div>

      <div class="table-identity">
        <strong class="table-number">{{ table.tableNumber || '--' }}</strong>
        <span class="table-name" :title="table.tableName || '未命名餐桌'">
          {{ table.tableName || '未命名餐桌' }}
        </span>
      </div>

      <img class="table-illustration" :src="illustration" alt="" />

      <div class="table-meta">
        <span class="meta-item">
          <Icon icon="ri:group-fill" />
          {{ table.seats || 0 }} 人
        </span>
        <span class="meta-item location" :title="locationText">
          <Icon icon="ri:map-pin-2-fill" />
          {{ locationText }}
        </span>
      </div>

      <div v-if="isInUse" class="status-time-strip session-strip">
        <Icon icon="ri:restaurant-2-fill" />
        <span>用餐中</span>
        <strong>{{ sessionDurationText }}</strong>
      </div>
      <div
        v-else-if="isReserved"
        class="status-time-strip reservation-strip"
        :title="reservationDetailText"
      >
        <Icon icon="ri:calendar-check-fill" />
        <span>预约 {{ reservationTimeText }} · {{ maskedReservationPhone }}</span>
        <strong>{{ reservationCountdownText }}</strong>
      </div>

      <div class="card-actions">
        <button
          type="button"
          class="primary-action"
          :disabled="isDisabled"
          @click="handlePrimaryAction"
        >
          <Icon :icon="primaryActionIcon" />
          <span>{{ primaryActionText }}</span>
        </button>

        <ElDropdown trigger="click" placement="bottom-end" @command="handleStatusCommand">
          <button type="button" class="more-action" aria-label="预约管理" @click.stop>
            <Icon icon="ri:add-line" />
          </button>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem
                v-for="item in reservationActions"
                :key="item.command"
                v-auth="[
                  'restaurant:table:status',
                  'operations:table-cashier:status',
                  'operations:table-reservation'
                ]"
                :command="item.command"
              >
                <Icon :icon="item.icon" />
                <span>{{ item.label }}</span>
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { Icon } from '@iconify/vue'
  import { formatDuration } from '@utils/cashier/utils'
  import type { TableItem } from '@/api/cashier'
  import availableTable from '@/assets/images/table/table-status-available.png'
  import inUseTable from '@/assets/images/table/table-status-in-use.png'
  import reservedTable from '@/assets/images/table/table-status-reserved.png'
  import disabledTable from '@/assets/images/table/table-status-disabled.png'

  const props = withDefaults(
    defineProps<{
      table: TableItem
      sessionStartTime?: string
      sessionDurationMinutes?: number
    }>(),
    {}
  )

  const emit = defineEmits<{
    (e: 'click', table: TableItem): void
    (e: 'reservation', table: TableItem): void
  }>()

  const now = ref(Date.now())
  let minuteTimer: ReturnType<typeof setInterval> | undefined

  const isDisabled = computed(() => props.table.status === '停用')
  const isInUse = computed(() => Boolean(props.table.sessionNo) || props.table.status === '使用中')
  const isReserved = computed(
    () =>
      !isDisabled.value &&
      !isInUse.value &&
      (Boolean(props.table.nextReservation) || props.table.status === '预留')
  )

  const statusClass = computed(() => ({
    'is-in-use': isInUse.value,
    'is-reserved': isReserved.value,
    'is-disabled': props.table.status === '停用'
  }))

  const displayStatus = computed(() => (isReserved.value ? '已预约' : props.table.status))

  const illustration = computed(() => {
    if (isDisabled.value) return disabledTable
    if (isInUse.value) return inUseTable
    if (isReserved.value) return reservedTable
    return availableTable
  })

  const locationText = computed(() => {
    const details = [props.table.storeName, props.table.location].filter(Boolean)
    return details.length ? details.join(' · ') : '位置待完善'
  })

  const primaryActionText = computed(() => {
    if (props.table.status === '停用') return '已停用'
    if (props.table.sessionNo || props.table.status === '使用中') return '进入收银'
    return '开台'
  })

  const primaryActionIcon = computed(() =>
    props.table.sessionNo || props.table.status === '使用中'
      ? 'ri:shopping-bag-3-fill'
      : 'ri:restaurant-2-fill'
  )

  const reservationActions = [
    { label: '预约', command: 'reservation', icon: 'ri:calendar-check-line' }
  ]

  const maskedReservationPhone = computed(() => {
    const phone = props.table.nextReservation?.reservationPhone || ''
    return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '已预留'
  })
  const reservationTimeText = computed(() => {
    const arrivalTime = props.table.nextReservation?.expectedArrivalTime || ''
    return arrivalTime.match(/(?:\d{4}-\d{2}-\d{2}[ T])?(\d{2}:\d{2})/)?.[1] || '待到店'
  })

  const reservationCountdownText = computed(() => {
    const arrivalTime = props.table.nextReservation?.expectedArrivalTime
    if (!arrivalTime) return '等待到店'

    const arrivalTimestamp = new Date(arrivalTime.replace(' ', 'T')).getTime()
    if (!Number.isFinite(arrivalTimestamp)) return '等待到店'

    const remainingMinutes = Math.ceil((arrivalTimestamp - now.value) / 60000)
    if (remainingMinutes <= 0) return '等待到店'

    const hours = Math.floor(remainingMinutes / 60)
    const minutes = remainingMinutes % 60
    if (!hours) return `还有 ${minutes}分钟`
    return `还有 ${hours}小时${minutes ? `${minutes}分钟` : ''}`
  })

  const reservationDetailText = computed(
    () =>
      `预约 ${reservationTimeText.value} · ${maskedReservationPhone.value} · ${reservationCountdownText.value}`
  )

  const sessionTimeText = computed(() => {
    void now.value
    const minutes = props.sessionDurationMinutes
    if (typeof minutes === 'number' && minutes >= 0) return formatDuration(minutes)
    if (props.sessionStartTime) return formatDuration(props.sessionStartTime)
    return ''
  })

  const sessionDurationText = computed(() =>
    sessionTimeText.value ? `已用餐 ${sessionTimeText.value}` : '刚刚开台'
  )

  onMounted(() => {
    minuteTimer = setInterval(() => {
      now.value = Date.now()
    }, 60000)
  })

  onUnmounted(() => {
    if (minuteTimer) clearInterval(minuteTimer)
  })

  const handlePrimaryAction = () => {
    if (!isDisabled.value) emit('click', props.table)
  }

  const handleStatusCommand = () => {
    emit('reservation', props.table)
  }
</script>

<style scoped lang="scss">
  .table-card {
    --card-accent: #11a85b;
    --card-accent-soft: rgb(17 168 91 / 10%);
    --card-border: rgb(76 201 139 / 26%);
    --card-fill: #effcf7;
    --card-background: url('@/assets/images/table/card-bg-available.png');

    position: relative;
    min-height: 166px;
    overflow: hidden;
    color: #0c2342;
    background-color: var(--card-fill);
    isolation: isolate;
    border: 1px solid var(--card-border);
    border-radius: 12px;
    box-shadow: 0 6px 16px rgb(20 112 76 / 7%);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;

    &::before {
      position: absolute;
      inset: -25%;
      z-index: -2;
      content: '';
      background-image: var(--card-background);
      background-repeat: no-repeat;
      background-position: center;
      background-size: cover;
    }

    &::after {
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      content: '';
      background: linear-gradient(90deg, rgb(255 255 255 / 12%), transparent 64%);
    }

    &:hover {
      z-index: 2;
      border-color: color-mix(in srgb, var(--card-accent) 42%, transparent);
      box-shadow: 0 12px 26px rgb(20 78 59 / 12%);
      transform: translateY(-2px);

      .table-illustration {
        transform: translateY(-2px) scale(1.02);
      }
    }

    &.is-in-use {
      --card-accent: #ff7a0b;
      --card-accent-soft: rgb(255 122 11 / 11%);
      --card-border: rgb(255 155 74 / 28%);
      --card-fill: #fff5ed;
      --card-background: url('@/assets/images/table/card-bg-in-use.png');
    }

    &.is-reserved {
      --card-accent: #d98b14;
      --card-accent-soft: rgb(217 139 20 / 12%);
      --card-border: rgb(225 161 61 / 30%);
      --card-fill: #fff8eb;
      --card-background: url('@/assets/images/table/card-bg-reserved.png');
    }

    &.is-disabled {
      --card-accent: #5d6978;
      --card-accent-soft: rgb(93 105 120 / 10%);
      --card-border: rgb(130 143 162 / 23%);
      --card-fill: #f3f6fa;
      --card-background: url('@/assets/images/table/card-bg-disabled.png');

      color: #324158;
      box-shadow: 0 7px 18px rgb(60 72 90 / 7%);

      &:hover {
        border-color: var(--card-border);
        box-shadow: 0 7px 18px rgb(60 72 90 / 7%);
        transform: none;
      }
    }
  }

  .card-content {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 166px;
    padding: 8px 9px;
  }

  .status-badge {
    display: inline-flex;
    gap: 7px;
    align-items: center;
    align-self: flex-start;
    min-height: 23px;
    padding: 0 8px;
    font-size: 11px;
    font-weight: 700;
    color: var(--card-accent);
    background: var(--card-accent-soft);
    border: 1px solid rgb(255 255 255 / 50%);
    border-radius: 999px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    background: var(--card-accent);
    border-radius: 50%;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--card-accent) 10%, transparent);
  }

  .table-identity {
    display: flex;
    flex-direction: column;
    width: 54%;
    min-width: 0;
    margin-top: 5px;
  }

  .table-number {
    overflow: hidden;
    font-size: clamp(23px, 1.8vw, 28px);
    font-weight: 850;
    line-height: 1;
    text-overflow: ellipsis;
    letter-spacing: -1px;
    white-space: nowrap;
  }

  .table-name {
    margin-top: 3px;
    overflow: hidden;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .table-illustration {
    position: absolute;
    top: 18px;
    right: 2px;
    width: 48%;
    height: 74px;
    pointer-events: none;
    object-fit: contain;
    object-position: center;
    filter: drop-shadow(0 8px 8px rgb(43 48 52 / 9%));
    transition: transform 0.25s ease;
  }

  .table-meta {
    display: flex;
    gap: 7px;
    align-items: center;
    margin-top: auto;
    margin-bottom: 3px;
    overflow: hidden;
    font-size: 11px;
    font-weight: 600;
    color: #54657b;
  }

  .meta-item {
    display: inline-flex;
    flex: 0 0 auto;
    gap: 4px;
    align-items: center;
    min-width: 0;

    svg {
      flex: 0 0 auto;
      font-size: 13px;
      color: #6c7c90;
    }

    &.location {
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .status-time-strip {
    display: flex;
    gap: 4px;
    align-items: center;
    min-width: 0;
    height: 20px;
    padding: 0 6px;
    margin-bottom: 3px;
    overflow: hidden;
    font-size: 9px;
    border-radius: 6px;

    svg {
      flex: 0 0 auto;
      font-size: 11px;
    }

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      flex: 0 0 auto;
      margin-left: auto;
      font-size: 9px;
      white-space: nowrap;
    }
  }

  .session-strip {
    color: #d45718;
    background: rgb(255 224 207 / 72%);
    border: 1px solid rgb(255 150 60 / 16%);
  }

  .reservation-strip {
    color: #b36c00;
    background: rgb(255 229 158 / 56%);
    border: 1px solid rgb(223 156 30 / 14%);
  }

  .card-actions {
    display: flex;
    gap: 7px;
    padding-top: 5px;
    border-top: 1px solid rgb(112 129 145 / 12%);
  }

  .primary-action,
  .more-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    font: inherit;
    color: var(--card-accent);
    cursor: pointer;
    background: color-mix(in srgb, var(--card-accent) 9%, white 63%);
    border: 1px solid rgb(255 255 255 / 70%);
    border-radius: 8px;
    transition: transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--card-accent) 14%, white 70%);
      box-shadow: 0 5px 12px color-mix(in srgb, var(--card-accent) 12%, transparent);
      transform: translateY(-1px);
    }

    &:disabled {
      color: #a7b0bd;
      cursor: not-allowed;
      background: rgb(220 226 234 / 52%);
      box-shadow: none;
    }
  }

  .primary-action {
    flex: 1;
    gap: 6px;
    font-size: 13px;
    font-weight: 750;

    svg {
      font-size: 16px;
    }
  }

  .more-action {
    width: 38px;
    font-size: 18px;
    background: rgb(255 255 255 / 35%);
    border-color: rgb(126 147 165 / 18%);
    border-style: dashed;
  }

  :deep(.el-dropdown-menu__item) {
    gap: 8px;
  }

  @media (width <= 480px) {
    .table-card,
    .card-content {
      min-height: 202px;
    }

    .card-content {
      padding: 14px;
    }

    .table-illustration {
      width: 46%;
    }
  }
</style>
