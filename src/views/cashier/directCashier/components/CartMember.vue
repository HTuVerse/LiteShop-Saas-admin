<template>
  <div class="cart-member">
    <div v-if="member" class="member-info">
      <div class="member-header">
        <ElAvatar class="member-avatar" :size="38" :src="member.avatar || member.portrait">
          {{ memberName.charAt(0) }}
        </ElAvatar>
        <div class="member-identity">
          <div class="member-headline">
            <strong class="nickname">{{ displayMemberName }}</strong>
            <span class="level-badge">{{ memberLevel }}</span>
          </div>
          <span class="phone">手机号：{{ member.phone || member.cellphone || '未绑定' }}</span>
        </div>
        <div v-if="!memberLocked" class="member-actions">
          <ElButton plain size="small" @click="handleChangeMember">更换</ElButton>
        </div>
      </div>
      <div class="member-stats">
        <div class="member-stat">
          <span>积分</span>
          <strong>{{ memberPoints }}</strong>
        </div>
        <div class="member-stat balance-stat">
          <span>会员余额</span>
          <strong>￥{{ formatMoney(memberBalance) }}</strong>
        </div>
      </div>
    </div>

    <div v-else-if="!memberLocked" class="member-lookup">
      <ElAvatar :size="40" :icon="User" />
      <ElInput
        v-model="phone"
        inputmode="numeric"
        maxlength="11"
        clearable
        placeholder="输入会员手机号"
        :prefix-icon="Iphone"
        @input="handlePhoneInput"
        @keyup.enter="lookupMember"
      />
      <ElButton type="primary" :loading="loading" @click="lookupMember">加载会员</ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, inject, ref } from 'vue'
  import { ElAvatar, ElButton, ElInput, ElMessage } from 'element-plus'
  import { Iphone, User } from '@element-plus/icons-vue'
  import { fetchCashierMemberByPhone } from '@/api/cashier'
  import { formatMoney } from '@utils/cashier/utils'

  const { member, updateMember } = inject<any>('member')
  const tableInfo = inject<any>('tableInfo', null)
  const memberLocked = computed(() => Boolean(tableInfo?.hasOrder?.value))
  const phone = ref('')
  const loading = ref(false)
  let lookupSequence = 0

  const memberName = computed(
    () => member.value?.username || member.value?.nickname || `会员${member.value?.id || ''}`
  )
  const displayMemberName = computed(() => {
    const characters = Array.from(String(memberName.value))
    return characters.length > 15 ? `${characters.slice(0, 15).join('')}...` : memberName.value
  })
  const memberBalance = computed(() =>
    Number(member.value?.surplusMoney ?? member.value?.balance ?? 0)
  )
  const memberLevel = computed(() => {
    const name = String(member.value?.levelName || '').trim()
    return name && !/^\d+$/.test(name) ? name : '未设置等级'
  })
  const memberPoints = computed(() => Number(member.value?.points ?? 0))

  const handlePhoneInput = (value: string) => {
    phone.value = String(value || '')
      .replace(/\D/g, '')
      .slice(0, 11)
  }

  const lookupMember = async () => {
    if (!/^1\d{10}$/.test(phone.value)) {
      ElMessage.warning('请输入正确的11位手机号')
      return
    }
    const sequence = ++lookupSequence
    loading.value = true
    try {
      const result: any = await fetchCashierMemberByPhone(phone.value)
      if (sequence !== lookupSequence) return
      if (!result?.id) {
        ElMessage.warning('未找到该手机号对应的会员')
        return
      }
      updateMember({
        ...result,
        username: result.username || result.nickname || `会员${result.id}`,
        surplusMoney: Number(result.surplusMoney ?? result.balance ?? 0)
      })
      ElMessage.success('会员加载成功')
    } catch (error: any) {
      if (sequence === lookupSequence) {
        ElMessage.error(error?.message || error?.msg || '会员加载失败')
      }
    } finally {
      if (sequence === lookupSequence) loading.value = false
    }
  }

  const handleChangeMember = () => {
    lookupSequence++
    updateMember(null)
    phone.value = ''
    loading.value = false
  }
</script>

<style scoped lang="scss">
  .cart-member {
    flex-shrink: 0;
    margin-bottom: 6px;
  }

  .member-info {
    padding: 8px 10px;
    background: linear-gradient(135deg, #fffaf2, var(--el-fill-color-blank));
    border: 1px solid #f1e6d2;
    border-radius: 10px;
  }

  .member-header {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .member-avatar {
    flex-shrink: 0;
  }

  .member-identity {
    min-width: 0;
  }

  .member-headline {
    display: flex;
    gap: 4px;
    align-items: center;
    min-width: 0;
    margin-bottom: 2px;
  }

  .nickname {
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .level-badge {
    flex-shrink: 0;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 600;
    color: #8b5b19;
    background: #f8e8c9;
    border-radius: 99px;
  }

  .phone {
    display: block;
    overflow: hidden;
    font-size: 11px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .member-actions {
    display: flex;
    flex-shrink: 0;
    gap: 0;
    align-items: center;

    :deep(.el-button) {
      height: 26px;
      padding: 4px 7px;
      font-size: 11px;
    }

  }

  .member-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding-top: 7px;
    margin-top: 7px;
    border-top: 1px solid #f1e6d2;
  }

  .member-stat {
    display: flex;
    gap: 6px;
    align-items: baseline;
    min-width: 0;
    padding-left: 8px;

    &:first-child {
      padding-left: 0;
      border-right: 1px solid #f1e6d2;
    }

    > span {
      flex-shrink: 0;
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }

    > strong {
      overflow: hidden;
      font-size: 14px;
      color: var(--el-text-color-primary);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .balance-stat > strong {
    color: var(--el-color-danger);
  }

  .member-lookup {
    display: flex;
    gap: 8px;
    align-items: center;
    min-height: 42px;
    padding: 2px;
  }

  .member-lookup :deep(.el-input) {
    flex: 1;
    min-width: 120px;
  }

  @media (width <= 540px) {
    .member-lookup {
      flex-wrap: wrap;
    }

    .member-lookup :deep(.el-input) {
      flex-basis: calc(100% - 52px);
    }
  }
</style>
