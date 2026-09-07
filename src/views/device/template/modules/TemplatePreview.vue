<!-- 打印模板预览组件 -->
<template>
  <div class="template-preview">
    <div class="preview-paper" :class="`paper-${templateData.paperWidth}`">
      <!-- 店铺Logo -->
      <div v-if="isEnabled(templateData.showLogo) && templateData.logoUrl" class="logo-section">
        <img :src="templateData.logoUrl" alt="店铺Logo" class="store-logo" />
      </div>

      <!-- 店铺名称 -->
      <div class="store-name" :class="`style-${templateData.storeNameStyle}`">
        {{ storeName }}
      </div>

      <!-- 店铺地址 -->
      <div v-if="isEnabled(templateData.showAddress)" class="store-info">
        地址：{{ storeAddress }}
      </div>

      <!-- 联系电话 -->
      <div v-if="isEnabled(templateData.showPhone)" class="store-info">
        电话：{{ storePhone }}
      </div>

      <!-- 营业时间 -->
      <div v-if="isEnabled(templateData.showBusinessHours)" class="store-info">
        营业时间：{{ businessHours }}
      </div>

      <div class="divider">================================</div>

      <!-- 取餐码突出显示模式 -->
      <div v-if="isEnabled(templateData.showPickupCode)" class="pickup-code-section">
        <div class="pickup-code-title">您的取餐码</div>
        <div class="pickup-code-value">A123</div>
        <div class="pickup-code-hint">(等餐期间请注意听取叫号)</div>
        <div class="divider">================================</div>
        <div class="pickup-mode">堂食</div>
      </div>

      <!-- 订单信息 -->
      <div class="order-info">
        <div v-for="field in orderFields" :key="field" class="info-item">
          <span class="label">{{ getFieldLabel(field) }}：</span>
          <span class="value">{{ getFieldValue(field) }}</span>
        </div>
      </div>

      <div class="divider">================================</div>

      <!-- 菜品列表 -->
      <div class="dish-list" :class="`font-size-${templateData.fontSize}`">
        <div class="dish-header">
          <span class="dish-name">菜品</span>
          <span class="dish-quantity">数量</span>
          <span class="dish-price">金额</span>
        </div>
        <div v-for="(dish, index) in dishList" :key="index" class="dish-item">
          <div class="dish-main">
            <span class="dish-name">{{ dish.name }}</span>
            <span class="dish-quantity">x{{ dish.quantity }}</span>
            <span class="dish-price">¥{{ dish.price }}</span>
          </div>
          <!-- 菜品规格 -->
          <div v-if="isEnabled(templateData.showDishSpec) && dish.spec" class="dish-detail">
            规格：{{ dish.spec }}
          </div>
          <!-- 菜品备注 -->
          <div v-if="isEnabled(templateData.showDishNote) && dish.note" class="dish-detail">
            备注：{{ dish.note }}
          </div>
        </div>
      </div>

      <div class="divider">--------------------------------</div>

      <!-- 支付信息 -->
      <div v-if="isEnabled(templateData.showPaymentInfo)" class="payment-info">
        <div class="payment-item">
          <span>小计：</span>
          <span>¥88.00</span>
        </div>
        <div class="payment-item">
          <span>优惠：</span>
          <span>-¥8.00</span>
        </div>
        <div class="payment-item total">
          <span>实付：</span>
          <span>¥80.00</span>
        </div>
      </div>

      <div class="divider">================================</div>

      <!-- 订单备注 -->
      <div v-if="isEnabled(templateData.showOrderNote)" class="order-note">
        订单备注：少油少盐
      </div>

      <!-- 底部欢迎语 -->
      <div v-if="templateData.footerText" class="footer-text">
        {{ templateData.footerText }}
      </div>

      <!-- 二维码 -->
      <div
        v-if="isEnabled(templateData.showQrcode)"
        class="qrcode-section"
        :class="`size-${templateData.qrcodeSize}`"
      >
        <div class="qrcode-placeholder">
          <Icon icon="ri:qr-code-line" />
        </div>
        <div class="qrcode-tip">扫码查看订单详情</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Icon } from '@iconify/vue'
  import { getEnumNumber, StatusTextMap } from '../../utils/enumConverter'

  defineOptions({ name: 'TemplatePreview' })

  const props = defineProps<{
    templateData: any
  }>()

  // 示例数据
  const storeName = '美食餐厅'
  const storeAddress = '北京市朝阳区xxx街道xxx号'
  const storePhone = '010-12345678'
  const businessHours = '10:00-22:00'

  const dishList = [
    { name: '宫保鸡丁', quantity: 2, price: '28.00', spec: '微辣', note: '不要花生' },
    { name: '麻婆豆腐', quantity: 1, price: '18.00', spec: '特辣', note: '' },
    { name: '米饭', quantity: 2, price: '2.00', spec: '', note: '' }
  ]

  // 辅助函数：判断枚举是否为启用状态（兼容数字和文字）
  const isEnabled = (value: any) => {
    const num = getEnumNumber(value, StatusTextMap) ?? value
    return num === 1
  }

  // 解析订单字段
  const orderFields = computed(() => {
    try {
      return JSON.parse(props.templateData.orderInfoFields || '[]')
    } catch (e) {
      return []
    }
  })

  // 字段标签映射
  const fieldLabelMap: Record<string, string> = {
    orderNo: '订单号',
    tableName: '桌台',
    orderType: '订单类型',
    customerName: '顾客',
    customerPhone: '电话',
    diningCount: '人数',
    createdAt: '时间'
  }

  // 字段值映射
  const fieldValueMap: Record<string, string> = {
    orderNo: '202501270001',
    tableName: 'A01',
    orderType: '堂食',
    customerName: '张先生',
    customerPhone: '138****8888',
    diningCount: '2',
    createdAt: '2025-01-27 12:30:00'
  }

  const getFieldLabel = (field: string) => {
    return fieldLabelMap[field] || field
  }

  const getFieldValue = (field: string) => {
    return fieldValueMap[field] || '-'
  }
</script>

<style scoped lang="scss">
  .template-preview {
    display: flex;
    align-items: flex-start; // 顶部对齐
    justify-content: center;
    max-height: calc(100vh - 200px); // 限制最大高度，根据页面布局调整
    padding: 20px;
    overflow-y: auto; // 添加垂直滚动条
    background-color: #f5f5f5;

    // 隐藏滚动条但保持滚动功能
    scrollbar-width: none; // Firefox
    -ms-overflow-style: none; // IE 10+

    &::-webkit-scrollbar {
      display: none; // Chrome, Safari, Edge
    }
  }

  .preview-paper {
    flex-shrink: 0; // 防止被压缩，保持完整尺寸
    padding: 16px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: #000;
    background: white;
    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);

    &.paper-58mm {
      width: 220px;
    }

    &.paper-80mm {
      width: 300px;
    }
  }

  .logo-section {
    margin-bottom: 10px;
    text-align: center;

    .store-logo {
      max-width: 80px;
      max-height: 80px;
    }
  }

  .store-name {
    margin-bottom: 8px;
    text-align: center;

    &.style-0 {
      // 普通
    }

    &.style-1 {
      font-weight: bold;
    }

    &.style-2 {
      font-weight: bold;
      text-align: center;
    }

    &.style-3 {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
    }
  }

  .store-info {
    margin-bottom: 4px;
    font-size: 11px;
  }

  .divider {
    margin: 8px 0;
    font-size: 10px;
    color: #666;
  }

  .order-info {
    .info-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;

      .label {
        font-weight: bold;
      }
    }
  }

  .dish-list {
    &.font-size-0 {
      font-size: 12px;
    }

    &.font-size-1 {
      font-size: 13px;
    }

    &.font-size-2 {
      font-size: 14px;
    }

    .dish-header {
      display: flex;
      justify-content: space-between;
      padding-bottom: 4px;
      margin-bottom: 8px;
      font-weight: bold;
      border-bottom: 1px solid #000;

      .dish-name {
        flex: 1;
      }

      .dish-quantity {
        width: 50px;
        text-align: center;
      }

      .dish-price {
        width: 60px;
        text-align: right;
      }
    }

    .dish-item {
      margin-bottom: 8px;

      .dish-main {
        display: flex;
        justify-content: space-between;

        .dish-name {
          flex: 1;
        }

        .dish-quantity {
          width: 50px;
          text-align: center;
        }

        .dish-price {
          width: 60px;
          text-align: right;
        }
      }

      .dish-detail {
        padding-left: 8px;
        margin-top: 2px;
        font-size: 11px;
        color: #666;
      }
    }
  }

  .payment-info {
    .payment-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;

      &.total {
        margin-top: 8px;
        font-size: 14px;
        font-weight: bold;
      }
    }
  }

  .order-note {
    margin: 8px 0;
    font-size: 11px;
    color: #666;
  }

  .footer-text {
    margin: 12px 0;
    font-size: 11px;
    text-align: center;
  }

  .qrcode-section {
    margin-top: 12px;
    text-align: center;

    .qrcode-placeholder {
      display: inline-block;
      background-color: #f9f9f9;
      border: 1px solid #ddd;

      :deep(.iconify) {
        display: block;
      }
    }

    &.size-1 .qrcode-placeholder {
      width: 80px;
      height: 80px;
      font-size: 60px;
    }

    &.size-2 .qrcode-placeholder {
      width: 100px;
      height: 100px;
      font-size: 80px;
    }

    &.size-3 .qrcode-placeholder {
      width: 120px;
      height: 120px;
      font-size: 100px;
    }

    .qrcode-tip {
      margin-top: 4px;
      font-size: 10px;
      color: #666;
    }
  }
</style>
