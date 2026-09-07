import axios, { type AxiosRequestConfig } from 'axios'
import { useUserStore } from '@/store/modules/user'
import { HttpError } from './error'
import { parseBackendJson } from './json'
import { ElMessage } from 'element-plus'

export interface RequestConfig extends AxiosRequestConfig {
  showErrorMessage?: boolean
  showSuccessMessage?: boolean
  returnFullResponse?: boolean
  anonymous?: boolean
  rawResponse?: boolean
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
  withCredentials: false,
  paramsSerializer: { indexes: null },
  transformResponse: [
    (data) => {
      if (typeof data !== 'string' || !data.trim()) return data
      try {
        return parseBackendJson(data)
      } catch {
        return data
      }
    }
  ]
})

let expiredToken = ''
async function request<T = any>(config: RequestConfig): Promise<T> {
  const session = useUserStore()
  const token = config.anonymous ? '' : session.accessToken
  const revision = session.sessionRevision
  const headers = new axios.AxiosHeaders(
    config.headers as ConstructorParameters<typeof axios.AxiosHeaders>[0]
  )
  headers.delete('satoken')
  if (token) headers.set('satoken', token)
  for (const name of [
    'X-Tenant-Id',
    'X-Super-Admin',
    'X-Store-Restricted',
    'X-Store-Ids',
    'X-Internal-Call',
    'X-Public-Tenant-Id'
  ])
    headers.delete(name)
  try {
    // params remain query parameters; JSON bodies are always explicitly passed as data.
    const response = await client.request({ ...config, headers })
    if (!config.anonymous && revision !== session.sessionRevision)
      throw new axios.CanceledError('会话已切换')
    if (config.responseType === 'blob' || config.responseType === 'arraybuffer')
      return response.data
    const body = response.data
    // AI service explicitly returns its own JSON schema instead of Result<T>.
    if (config.rawResponse) return body
    if (!body || typeof body !== 'object' || !('code' in body))
      throw new HttpError('网关返回了非预期数据，请检查代理配置', 502)
    if (Number(body.code) !== 200) throw new HttpError(body.msg || '请求失败', Number(body.code))
    if (config.showSuccessMessage && body.msg) ElMessage.success(body.msg)
    return config.returnFullResponse ? body : body.data
  } catch (cause) {
    if (axios.isCancel(cause)) throw cause
    if (!config.anonymous && revision !== session.sessionRevision)
      throw new axios.CanceledError('会话已切换')
    const error =
      cause instanceof HttpError
        ? cause
        : new HttpError(
            axios.isAxiosError(cause)
              ? cause.response?.data?.msg ||
                (cause.code === 'ECONNABORTED'
                  ? '请求超时，请确认操作结果后再试'
                  : cause.response
                    ? `请求失败（${cause.response.status}）`
                    : '无法连接网关，请检查后端服务')
              : '请求失败',
            axios.isAxiosError(cause) ? Number(cause.response?.status || 0) : 500
          )
    if (error.code === 401 && token && token === session.accessToken) {
      if (expiredToken !== token) {
        expiredToken = token
        ElMessage.error(error.message || '登录已失效，请重新登录')
        session.logOut()
      }
    } else if (config.showErrorMessage !== false) ElMessage.error(error.message)
    throw error
  }
}

// Financial and one-time-ticket operations must never be automatically retried.
export default {
  get: <T = any>(config: RequestConfig) => request<T>({ ...config, method: 'GET' }),
  post: <T = any>(config: RequestConfig) => request<T>({ ...config, method: 'POST' }),
  put: <T = any>(config: RequestConfig) => request<T>({ ...config, method: 'PUT' }),
  del: <T = any>(config: RequestConfig) => request<T>({ ...config, method: 'DELETE' }),
  request
}
