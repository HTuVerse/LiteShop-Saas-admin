<template>
  <div class="cart-member">
    <div v-if="member && !editing" class="member-info">
      <ElAvatar :size="44" :src="member.avatar || member.portrait">
        {{ memberName.charAt(0) }}
      </ElAvatar>
      <div class="info">
        <div class="nickname">{{ memberName }}</div>
        <div class="phone">{{ member.phone || member.cellphone || '-' }}</div>
        <div class="balance">余额：￥{{ formatMoney(memberBalance) }}</div>
      </div>
      <ElButton plain size="small" @click="startEditing">更换</ElButton>
      <ElButton type="danger" text size="small" @click="handleClear">清除</ElButton>
    </div>

    <div v-else class="member-lookup">
      <ElAvatar :size="40" :icon="User" />
      <ElInput
        ref="phoneInputRef"
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
      <ElButton v-if="member" text @click="editing = false">取消</ElButton>
    </div>

    <div class="member-benefit">
      <ElIcon><TrophyBase /></ElIcon>
      <span>{{
        member ? '会员权益已生效，本单可享会员优惠' : '输入手机号加载会员，可使用积分与余额'
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, inject, nextTick, ref } from 'vue'
  import { ElAvatar, ElButton, ElIcon, ElInput, ElMessage } from 'element-plus'
  import { Iphone, TrophyBase, User } from '@element-plus/icons-vue'
  import { fetchCashierMemberByPhone } from '@/api/cashier'
  import { formatMoney } from '@utils/cashier/utils'

  const { member, updateMember } = inject<any>('member')
  const phone = ref('')
  const editing = ref(false)
  const loading = ref(false)
  const phoneInputRef = ref<InstanceType<typeof ElInput>>()
  let lookupSequence = 0

  const memberName = computed(
    () => member.value?.username || member.value?.nickname || `会员${member.value?.id || ''}`
  )
  const memberBalance = computed(() =>
    Number(member.value?.surplusMoney ?? member.value?.balance ?? 0)
  )

  const startEditing = () => {
    phone.value = ''
    editing.value = true
    nextTick(() => phoneInputRef.value?.focus())
  }

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
      editing.value = false
      ElMessage.success('会员加载成功')
    } catch (error: any) {
      if (sequence === lookupSequence) {
        ElMessage.error(error?.message || error?.msg || '会员加载失败')
      }
    } finally {
      if (sequence === lookupSequence) loading.value = false
    }
  }

  const handleClear = () => {
    lookupSequence++
    updateMember(null)
    phone.value = ''
    editing.value = false
  }
</script>

<style scoped lang="scss">
  .cart-member {
    padding-bottom: 5px;
    margin-bottom: 6px;
  }

  .member-info,
  .member-lookup {
    display: flex;
    gap: 8px;
    align-items: center;
    min-height: 42px;
    padding: 2px;
  }

  .member-info .info {
    flex: 1;
    min-width: 0;
  }

  .nickname {
    margin-bottom: 3px;
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .phone,
  .balance {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .balance {
    color: var(--el-color-danger);
  }

  .member-lookup :deep(.el-input) {
    flex: 1;
    min-width: 120px;
  }

  .member-benefit {
    display: flex;
    gap: 7px;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    margin-top: 5px;
    font-size: 11px;
    color: #b66316;
    background: linear-gradient(90deg, #fff4df, #fff8ed);
    border: 1px solid #ffe7bf;
    border-radius: 8px;

    > .el-icon {
      flex-shrink: 0;
      font-size: 16px;
      color: #ed971d;
    }
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
