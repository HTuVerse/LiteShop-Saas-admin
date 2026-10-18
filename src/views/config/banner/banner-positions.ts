/** 小程序实际使用的三处轮播位置，保留已有数据的编号。 */
export const BANNER_POSITIONS = [
  { label: '首页背景轮播图', value: 1 },
  { label: '首页活动轮播图', value: 4 },
  { label: '点餐页轮播图', value: 2 }
] as const

export const BANNER_POSITION_LABELS: Record<string, string> = {
  首页背景轮播图: '首页背景',
  首页轮播图: '首页背景',
  首页活动轮播图: '首页活动',
  活动页轮播图: '首页活动',
  点餐页轮播图: '点餐页'
}
