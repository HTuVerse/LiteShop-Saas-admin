import QRCode from '@/utils/export/qrcode'
import { useUserStore } from '@/store/modules/user'
import type { DeployConfig } from '@/api/config-manage'

const QRCODE_SIZE = 180

function normalizeH5BaseUrl(url: string): string {
  if (!url) return ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`
  }
  return url.replace(/[/#]+$/, '')
}

function normalizeMiniappBaseUrl(url: string): string {
  if (!url) return ''
  if (!url.startsWith('http')) return `https://${url}`
  return url
}

/**
 * 根据餐桌与部署配置生成二维码内容（URL）
 */
export function getQrcodeValue(
  table: Partial<Api.Table.TableListItem>,
  deployConfig: DeployConfig,
  platformType: 'h5' | 'miniapp'
): string {
  const tenantId = useUserStore().activeTenant?.id || useUserStore().info.tenantId
  if (!tenantId) throw new Error('请先进入商户再生成二维码')
  const tableId = table.id
  const storeId = table.storeId
  if (!tableId) return ''

  if (platformType === 'h5') {
    const baseUrl = normalizeH5BaseUrl(deployConfig.h5BaseUrl)
    if (!baseUrl) return `[请先配置H5应用域名]`
    return `${baseUrl}/#/pages/order/components/selectDiningCount?tableId=${tableId}&storeId=${storeId}&tenantId=${tenantId}`
  } else {
    const baseUrl = normalizeMiniappBaseUrl(deployConfig.miniappBaseUrl)
    if (!baseUrl) return `[请先配置小程序域名前缀]`
    return `${baseUrl}?tableId=${tableId}&storeId=${storeId}&tenantId=${tenantId}`
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawFullQrcodeCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  qrImage: HTMLImageElement,
  _logoImage: HTMLImageElement | null,
  table: Partial<Api.Table.TableListItem>
) {
  const padding = 40
  const titleHeight = 80
  const qrX = padding
  const qrY = padding + titleHeight

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#333333'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(table.storeName || '门店名称', canvas.width / 2, padding + 30)

  ctx.fillStyle = '#666666'
  ctx.font = '16px sans-serif'
  ctx.fillText(table.tableName || '餐桌', canvas.width / 2, padding + 55)

  ctx.drawImage(qrImage, qrX, qrY, QRCODE_SIZE, QRCODE_SIZE)

  const tipY = padding + titleHeight + QRCODE_SIZE + 15

  const tableY = tipY + 20
  ctx.fillStyle = '#fef6f0'
  ctx.strokeStyle = '#ff9500'
  ctx.lineWidth = 2
  roundRect(ctx, padding + 20, tableY, canvas.width - padding * 2 - 40, 40, 20)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#909399'
  ctx.font = '14px sans-serif'
  ctx.fillText('桌号', canvas.width / 2 - 30, tableY + 26)

  ctx.fillStyle = '#ff9500'
  ctx.font = 'bold 20px sans-serif'
  ctx.fillText(table.tableNumber || '', canvas.width / 2 + 20, tableY + 28)
}

/**
 * 为单张餐桌生成完整二维码图片的 Data URL（含标题、可选 Logo）
 * 用于单张下载或批量导出
 */
export function generateTableQrcodeDataUrl(
  table: Partial<Api.Table.TableListItem>,
  deployConfig: DeployConfig,
  platformType: 'h5' | 'miniapp'
): Promise<string> {
  const value = getQrcodeValue(table, deployConfig, platformType)
  if (!value || value.startsWith('[')) {
    return Promise.reject(new Error('请先配置并生成有效二维码链接'))
  }

  const padding = 40
  const titleHeight = 80
  const tipHeight = 50
  const tableNumberHeight = 60
  const totalWidth = QRCODE_SIZE + padding * 2
  const totalHeight = QRCODE_SIZE + titleHeight + tipHeight + tableNumberHeight + padding * 2

  return QRCode.toDataURL(value, { width: QRCODE_SIZE, margin: 0 }).then(
    (qrDataUrl: string) =>
      new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas')
        canvas.width = totalWidth
        canvas.height = totalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建画布'))
          return
        }

        const qrImg = new Image()
        qrImg.onload = () => {
          // 移除二维码中心 Logo，仅生成纯二维码
          drawFullQrcodeCanvas(ctx, canvas, qrImg, null, table)
          resolve(canvas.toDataURL('image/png'))
        }
        qrImg.onerror = () => reject(new Error('二维码图片加载失败'))
        qrImg.src = qrDataUrl
      })
  )
}
