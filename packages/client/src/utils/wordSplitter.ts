export interface TextSegment {
  text: string
  isWord: boolean
}

const WORD_RE = /([a-zA-Z]+(?:['''][a-zA-Z]+)*)/g

export function splitIntoSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(WORD_RE)) {
    const index = match.index!
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), isWord: false })
    }
    segments.push({ text: match[0], isWord: true })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isWord: false })
  }

  return segments
}
