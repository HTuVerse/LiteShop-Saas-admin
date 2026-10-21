<template>
  <ElDialog
    v-model="dialogVisible"
    :title="product ? '编辑兑换商品' : '新增兑换商品'"
    width="620px"
    destroy-on-close
  >
    <ArtForm ref="formRef" :model="form" :rules="rules" label-width="105px">
      <ElFormItem label="商品名称" prop="name">
        <ElInput
          v-model="form.name"
          maxlength="80"
          show-word-limit
          placeholder="例如：菜品免单券"
        />
      </ElFormItem>
      <ElFormItem label="关联优惠券" prop="couponId">
        <ElSelect
          v-model="form.couponId"
          filterable
          remote
          :remote-method="loadCoupons"
          :loading="couponLoading"
          placeholder="搜索已上架优惠券"
          style="width: 100%"
        >
          <ElOption
            v-for="coupon in couponOptions"
            :key="String(coupon.id)"
            :label="`${coupon.name}（剩余 ${coupon.remainCount ?? 0} 张）`"
            :value="String(coupon.id)"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="所需积分" prop="pointsPrice">
        <ElInputNumber v-model="form.pointsPrice" :min="1" :max="100000000" :precision="0" />
      </ElFormItem>
      <ElFormItem label="兑换库存" prop="stock">
        <ElInputNumber v-model="form.stock" :min="0" :max="100000000" :precision="0" />
      </ElFormItem>
      <ElFormItem label="排序" prop="sort">
        <ElInputNumber v-model="form.sort" :min="0" :max="99999" :precision="0" />
      </ElFormItem>
      <ElFormItem label="上架状态" prop="status">
        <ElSwitch v-model="published" active-text="上架" inactive-text="下架" />
      </ElFormItem>
      <ElFormItem label="商品说明" prop="description">
        <ElInput
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="说明优惠券的适用条件"
        />
      </ElFormItem>
      <ElFormItem label="图片地址" prop="imageUrl">
        <ElInput v-model="form.imageUrl" maxlength="500" placeholder="可选，填写可访问的图片 URL" />
      </ElFormItem>
    </ArtForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="submit">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { computed, reactive, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { fetchGetCouponList } from '@/api/coupon-manage'
  import { createMallProduct, updateMallProduct } from '@/api/points-mall'
  import type { PointsMallProduct, PointsMallProductForm } from '@/api/points-mall'

  const props = defineProps<{ visible: boolean; product?: PointsMallProduct | null }>()
  const emit = defineEmits<{ (e: 'update:visible', value: boolean): void; (e: 'success'): void }>()
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })
  const formRef = ref<FormInstance>()
  const form = reactive<PointsMallProductForm>({
    name: '',
    description: '',
    imageUrl: '',
    couponId: '',
    pointsPrice: 100,
    stock: 0,
    status: 0,
    sort: 0
  })
  const published = computed({
    get: () => form.status === 1,
    set: (value) => {
      form.status = value ? 1 : 0
    }
  })
  const couponOptions = ref<Api.Coupon.CouponListItem[]>([])
  const couponLoading = ref(false)
  const submitting = ref(false)
  const rules: FormRules = {
    name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
    couponId: [{ required: true, message: '请选择已上架优惠券', trigger: 'change' }],
    pointsPrice: [
      { type: 'number', required: true, min: 1, message: '所需积分必须大于 0', trigger: 'change' }
    ],
    stock: [
      { type: 'number', required: true, min: 0, message: '库存不能为负数', trigger: 'change' }
    ]
  }

  async function loadCoupons(keyword = '') {
    couponLoading.value = true
    try {
      const result = await fetchGetCouponList({
        currentPage: 1,
        pageSize: 30,
        name: keyword,
        status: 1
      })
      couponOptions.value = result.records || []
      if (
        props.product?.couponId &&
        !couponOptions.value.some((c) => String(c.id) === String(props.product?.couponId))
      ) {
        couponOptions.value.unshift({
          id: props.product.couponId,
          name: `优惠券 ${props.product.couponId}`
        } as Api.Coupon.CouponListItem)
      }
    } catch {
      couponOptions.value = []
    } finally {
      couponLoading.value = false
    }
  }

  watch(
    () => props.visible,
    (visible) => {
      if (!visible) return
      Object.assign(
        form,
        {
          name: '',
          description: '',
          imageUrl: '',
          couponId: '',
          pointsPrice: 100,
          stock: 0,
          status: 0,
          sort: 0
        },
        props.product || {}
      )
      form.couponId = String(props.product?.couponId || '')
      loadCoupons()
    }
  )

  async function submit() {
    if (!(await formRef.value?.validate().catch(() => false))) return
    submitting.value = true
    try {
      const payload = { ...form }
      if (props.product) await updateMallProduct(props.product.id, payload)
      else await createMallProduct(payload)
      ElMessage.success('保存成功')
      dialogVisible.value = false
      emit('success')
    } finally {
      submitting.value = false
    }
  }
</script>
