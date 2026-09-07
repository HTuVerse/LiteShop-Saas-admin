<template>
  <div class="dish-card">
    <div class="dish-header">
      <div class="dish-image">
        <el-image :src="getMainImage()" fit="cover">
          <template #error>
            <div class="image-placeholder">
              <el-icon><Picture /></el-icon>
            </div>
          </template>
        </el-image>
      </div>
      <div class="dish-info">
        <h2 class="dish-name">{{ dishData.dishName }}</h2>
        <div class="dish-tags">
          <el-tag v-if="dishData.isRecommend === '是'" size="small" type="success">推荐</el-tag>
          <el-tag v-if="dishData.isHot === '是'" size="small" type="danger">热门</el-tag>
          <el-tag v-if="dishData.isNew === '是'" size="small" type="warning">新品</el-tag>
          <el-tag size="small" type="info">{{ dishData.sceneType }}</el-tag>
          <el-tag size="small" :type="dishData.saleStatus === '上架' ? 'success' : 'info'">
            {{ dishData.saleStatus }}
          </el-tag>
        </div>
        <div class="dish-desc">{{ dishData.dishDesc || '暂无描述' }}</div>
        <div v-if="dishData.price && dishData.originalPrice > dishData.price" class="dish-price">
          <span class="current-price">¥{{ dishData.price }}</span>
          <span class="original-price"> ¥{{ dishData.originalPrice }} </span>
        </div>
        <div v-else class="dish-price">
          <span class="current-price">¥{{ dishData.originalPrice }}</span>
        </div>
      </div>
    </div>

    <div class="dish-details">
      <div class="detail-item">
        <span class="label">单位:</span>
        <span class="value">{{ dishData.unit || '份' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">库存:</span>
        <span class="value">{{ dishData.stock || 0 }}</span>
      </div>
      <div class="detail-item">
        <span class="label">销量:</span>
        <span class="value">{{ dishData.salesCount || 0 }}</span>
      </div>
      <div class="detail-item">
        <span class="label">浏览量:</span>
        <span class="value">{{ dishData.viewCount || 0 }}</span>
      </div>
      <div class="detail-item">
        <span class="label">制作时间:</span>
        <span class="value">{{ dishData.cookingTime || 0 }}分钟</span>
      </div>
      <div v-if="dishData.tags" class="detail-item">
        <span class="label">标签:</span>
        <span class="value">{{ dishData.tags }}</span>
      </div>
      <div v-if="dishData.allergens" class="detail-item">
        <span class="label">过敏原:</span>
        <span class="value">{{ dishData.allergens }}</span>
      </div>
    </div>

    <div v-if="dishData.specOptions && dishData.specOptions.length > 0" class="dish-specs">
      <h3>规格选项</h3>
      <div
        @click="$emit('edit-spec', spec)"
        v-for="spec in dishData.specOptions"
        :key="spec.id"
        class="spec-group"
      >
        <div class="spec-header">
          <div class="spec-title">
            <span class="spec-name">{{ spec.specName }}</span>
            <el-tag
              size="small"
              :type="spec.isRequired === '是' ? 'primary' : 'warning'"
              class="required-tag"
            >
              {{ spec.isRequired === '是' ? '必选' : '可选' }}
            </el-tag>
            <el-tag
              size="small"
              :type="spec.moreSelect === '是' ? 'primary' : 'warning'"
              class="required-tag"
            >
              {{ spec.moreSelect === '是' ? '多选' : '单选' }}
            </el-tag>
          </div>
          <div class="delete-icon" @click.stop="$emit('delete-spec', spec)">
            <el-icon><Close /></el-icon>
          </div>
        </div>
        <div class="spec-values">
          <el-tag
            v-for="(value, index) in spec.specValueList"
            :key="index"
            class="spec-value-tag"
            :effect="value.isDefault ? 'dark' : 'plain'"
          >
            {{ value.value }}
            <span v-if="value.extraPrice > 0" class="extra-price">+¥{{ value.extraPrice }}</span>
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Picture, Close } from '@element-plus/icons-vue'
  import { ref } from 'vue'

  const props = defineProps({
    dishData: {
      type: Object,
      required: true
    }
  })

  defineEmits(['edit-spec', 'delete-spec'])

  // 默认图片
  const defaultImage = ref(
    'https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png'
  )

  // 获取主图（取第一张图片）
  const getMainImage = () => {
    if (props.dishData.dishPics) {
      const images = props.dishData.dishPics.split(',')
      return images[0].trim() || defaultImage.value
    }
    return defaultImage.value
  }

  // 获取所有图片（用于预览）
  // const getAllImages = () => {
  //   if (props.dishData.dishPics) {
  //     return props.dishData.dishPics.split(',').map((url: string) => url.trim()).filter(Boolean)
  //   }
  //   return []
  // }
</script>

<style lang="scss" scoped>
  .dish-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    padding: 4px;
    margin: 0 auto;
    overflow-y: auto;

    /* 隐藏滚动条 - Firefox */
    scrollbar-width: none;

    /* 隐藏滚动条 - IE/Edge */
    -ms-overflow-style: none;

    /* 隐藏滚动条 - Webkit浏览器 */
    &::-webkit-scrollbar {
      width: 0;
      background: transparent;
    }

    .dish-header {
      display: flex;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px dashed #e0e0e0;

      .dish-image {
        flex-shrink: 0;
        width: 120px;
        height: 120px;
        overflow: hidden;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
        transition: transform 0.3s ease;

        &:hover {
          transform: scale(1.03);
        }

        .el-image {
          width: 100%;
          height: 100%;
        }

        .image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          font-size: 28px;
          color: #909399;
          background-color: #f5f7fa;
        }
      }

      .dish-info {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 8px;
        min-width: 0; // 防止文本溢出

        .dish-name {
          position: relative;
          padding-bottom: 6px;
          margin: 0;
          overflow: hidden;
          font-size: 18px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          text-overflow: ellipsis;
          white-space: nowrap;

          &::after {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 40px;
            height: 2px;
            content: '';
            background-color: var(--el-color-primary);
            border-radius: 2px;
          }
        }

        .dish-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 2px;

          .el-tag {
            padding: 0 8px;
            font-weight: 500;
            border-radius: 12px;
            transition: transform 0.2s ease;

            &:hover {
              transform: translateY(-2px);
            }
          }
        }

        .dish-desc {
          display: -webkit-box;
          padding-left: 8px;
          margin-top: 4px;
          overflow: hidden;
          font-size: 13px;
          font-style: italic;
          line-height: 1.5;
          color: var(--el-text-color-secondary);
          text-overflow: ellipsis;
          border-left: 2px solid #e0e0e0;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .dish-price {
          display: flex;
          gap: 8px;
          align-items: baseline;
          padding-top: 6px;
          margin-top: auto;

          .current-price {
            font-size: 20px;
            font-weight: bold;
            color: #f56c6c;
            text-shadow: 0 1px 1px rgb(0 0 0 / 5%);
          }

          .original-price {
            font-size: 13px;
            color: var(--el-text-color-secondary);
            text-decoration: line-through;
            opacity: 0.8;
          }
        }
      }
    }

    .dish-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      padding: 14px;
      margin: 4px 0;
      font-size: 13px;
      background-color: #f8f9fa;
      border-radius: 10px;
      box-shadow: inset 0 0 6px rgb(0 0 0 / 5%);

      &:hover {
        background-color: #f2f6fc;
      }

      .detail-item {
        display: flex;
        align-items: center;
        padding: 4px 0;
        transition: all 0.2s ease;

        &:hover {
          transform: translateX(3px);
        }

        .label {
          margin-right: 6px;
          font-weight: 500;
          color: var(--el-text-color-secondary);
          opacity: 0.8;
        }

        .value {
          overflow: hidden;
          font-weight: 600;
          color: var(--el-text-color-primary);
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .dish-specs {
      h3 {
        position: relative;
        display: inline-block;
        padding-bottom: 6px;
        margin: 8px 0 12px;
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);

        &::after {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          content: '';
          background: linear-gradient(90deg, var(--el-color-primary), transparent);
          border-radius: 2px;
        }
      }

      .spec-group {
        padding: 12px;
        margin-bottom: 16px;
        cursor: pointer;
        background-color: #f8f9fa;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgb(0 0 0 / 5%);
        transition: all 0.3s ease;

        &:hover {
          background-color: #f2f6fc;
          box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
          transform: translateY(-2px);
        }

        .spec-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;

          .spec-title {
            display: flex;
            gap: 8px;
            align-items: center;

            .spec-name {
              font-size: 14px;
              font-weight: 600;
              color: var(--el-text-color-primary);
            }

            .required-tag {
              padding: 0 8px;
              font-size: 11px;
              border-radius: 10px;
            }
          }

          .delete-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            color: #909399;
            cursor: pointer;
            border-radius: 50%;
            transition: all 0.3s;

            &:hover {
              color: #f56c6c;
              background-color: rgb(245 108 108 / 10%);
              transform: rotate(90deg);
            }
          }
        }

        .spec-values {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 4px 0;

          .spec-value-tag {
            display: flex;
            align-items: center;
            font-size: 12px;
            border-radius: 12px;
            transition: all 0.2s ease;

            &:hover {
              transform: scale(1.05);
            }

            .extra-price {
              margin-left: 4px;
              font-size: 11px;
              font-weight: bold;
              color: #f56c6c;
            }
          }
        }
      }
    }
  }
</style>
