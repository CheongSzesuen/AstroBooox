export interface ParsedReviewComment {
  tagType: 'NEEDFIX' | 'FIXED' | ''
  tagId: string
  replyTarget: string
  replyExcerpt: string
  content: string
}

const COMMENT_TAG_PATTERN = /^\s*\[ABCC_(NEEDFIX|FIXED)_([^\]]+)\]\s*([\s\S]*)$/i

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const renderCommentMarkdownHtml = (source: string): string => {
  let html = escapeHtml(source || '')
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => {
    const normalizedLabel = label.replace(/^`(.+)`$/, '$1')
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2">${normalizedLabel}</a>`
  })
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">$1</code>')
  html = html.replace(/\n/g, '<br>')
  return html
}

export const parseReviewCommentBody = (body: string): ParsedReviewComment => {
  const normalized = body || ''
  const tagMatch = normalized.match(COMMENT_TAG_PATTERN)
  const tagType = (tagMatch?.[1]?.toUpperCase() as 'NEEDFIX' | 'FIXED' | undefined) || ''
  const tagId = tagMatch?.[2]?.trim() || ''
  const rawContent = (tagMatch?.[3] || normalized).trim()

  const targetMatch = rawContent.match(/^\s*>\s*Reply-To:\s*(.+)$/m)
  if (!targetMatch) {
    return {
      tagType,
      tagId,
      replyTarget: '',
      replyExcerpt: '',
      content: rawContent
    }
  }

  const replyTarget = targetMatch[1].trim()
  const lines = rawContent.split('\n')
  const filtered: string[] = []
  let replyExcerpt = ''
  let consumeNextQuote = false

  for (const line of lines) {
    if (/^\s*>\s*Reply-To:\s*/.test(line)) {
      consumeNextQuote = true
      continue
    }
    if (consumeNextQuote && /^\s*>\s*/.test(line)) {
      replyExcerpt = line.replace(/^\s*>\s*/, '').trim()
      consumeNextQuote = false
      continue
    }
    filtered.push(line)
  }

  return {
    tagType,
    tagId,
    replyTarget,
    replyExcerpt,
    content: filtered.join('\n').trim()
  }
}
