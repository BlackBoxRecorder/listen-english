// 音标对象（新 API 格式：对象，包含音频和音标字符串）
export interface WordPhonetic {
  audio: string;
  phonetic: string;
}

// 短语
export interface WordPhrase {
  key: string;
  value: string[];
}

// 柯林斯词典例句
export interface WordCollinsSent {
  description: string;
  example: string;
  translate: string;
}

// 翻译例句（含音频）
export interface WordTransSent {
  audio_url: string;
  example: string;
  translate: string;
}

// 单词完整数据
export interface WordData {
  word: string;
  explains: string[];
  phonetic: WordPhonetic;
  phrase: WordPhrase[];
  collins_sents: WordCollinsSent[];
  trans_sents: WordTransSent[];
}

// 服务端代理层返回的查词响应
export interface WordSearchResponse {
  success: boolean;
  error: string;
  data: WordData;
}
