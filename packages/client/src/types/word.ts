export interface WordPhrase {
  key: string
  value: string[]
}

export interface WordSentence {
  description: string
  example: string
  translate: string
}

export interface WordLemma {
  id: number
  base_word: string
  variant: string
}

export interface WordResemble {
  id: number
  group_id: number
  word: string
  explanation: string
}

export interface WordData {
  id: number
  word: string
  explains: string[]
  phonetic: string
  phrase: WordPhrase[]
  sents: WordSentence[]
  frq: number
  base: number
  verify: number
  lemmas: WordLemma[]
  resembles: WordResemble[]
  source: string
}

export interface WordSearchResponse {
  success: boolean
  data: WordData
  offset: number
  limit: number
  total: number
}
