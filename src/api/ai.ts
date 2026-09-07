import request from '@/utils/http'
export const getAiStatus = () =>
  request.get<{ enabled: boolean; provider: string }>({ url: '/ai/status', rawResponse: true })
export const sendAiMessage = (message: string, signal?: AbortSignal) =>
  request.post<{ content: string }>({
    url: '/ai/chat',
    data: { message },
    rawResponse: true,
    timeout: 90000,
    signal
  })
