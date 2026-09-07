import { h, render, nextTick } from 'vue'
import QrcodeCanvas from 'qrcode.vue'
export default {
  async toDataURL(
    value: string,
    options: {
      width?: number
      margin?: number
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
      color?: { dark?: string; light?: string }
    } = {}
  ) {
    const host = document.createElement('div')
    try {
      render(
        h(QrcodeCanvas, {
          value,
          renderAs: 'canvas',
          size: options.width || 180,
          level: options.errorCorrectionLevel || 'M',
          margin: options.margin || 0,
          foreground: options.color?.dark || '#000000',
          background: options.color?.light || '#ffffff'
        }),
        host
      )
      await nextTick()
      const canvas = host.querySelector('canvas')
      if (!canvas) throw new Error('二维码生成失败')
      return canvas.toDataURL('image/png')
    } finally {
      render(null, host)
    }
  }
}
