import type {
  AiAdvisorMessageRound,
  AiChatView,
  AiFeedback,
  AiManagerAction,
  AiManagerEvidence,
  AiManagerKeyPoint,
  AiManagerResult
} from '../../api/ai'

export interface AdvisorMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  requestId?: string
  keyPoints?: AiManagerKeyPoint[]
  evidence?: AiManagerEvidence[]
  actions?: AiManagerAction[]
  dataPeriod?: string
  feedback?: AiFeedback
  chatView?: AiChatView
}

export function assistantMessageFromResult(
  result: AiManagerResult,
  requestId?: string,
  feedback?: AiFeedback,
  fallbackTime = new Date().toISOString()
): AdvisorMessage {
  return {
    role: 'assistant',
    content: result.content,
    createdAt: result.generatedAt || fallbackTime,
    requestId,
    keyPoints: result.keyPoints,
    evidence: result.evidence,
    actions: result.actions,
    dataPeriod: typeof result.scope?.dataPeriods === 'string' ? result.scope.dataPeriods : '',
    feedback,
    chatView: result.chatView || undefined
  }
}

export function restoreAdvisorRounds(rounds: AiAdvisorMessageRound[]): AdvisorMessage[] {
  const messages: AdvisorMessage[] = []
  for (const round of rounds) {
    if (round.question)
      messages.push({
        role: 'user',
        content: round.question,
        createdAt: round.createdAt,
        requestId: round.requestId
      })
    if (!round.responseJson) continue
    try {
      const result = JSON.parse(round.responseJson) as AiManagerResult
      if (typeof result?.content !== 'string' || !result.content.trim()) continue
      messages.push(
        assistantMessageFromResult(result, round.requestId, round.feedback, round.updatedAt)
      )
    } catch {
      // 损坏的旧记录只展示用户问题。
    }
  }
  return messages
}
