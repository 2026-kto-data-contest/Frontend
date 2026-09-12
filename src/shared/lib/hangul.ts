const CHOSUNG_LIST = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const CHOSUNG_UNIT = 588;

export function getChosung(text: string): string {
  let result = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0) - HANGUL_BASE;
    if (code >= 0 && code <= HANGUL_LAST - HANGUL_BASE) {
      result += CHOSUNG_LIST[Math.floor(code / CHOSUNG_UNIT)];
    } else {
      result += ch;
    }
  }
  return result;
}

export function isChosungOnly(text: string): boolean {
  return text.length > 0 && [...text].every((ch) => CHOSUNG_LIST.includes(ch));
}

export interface MatchRange {
  index: number;
  length: number;
}

export function findMatchRange(target: string, query: string): MatchRange | null {
  const normalizedTarget = target.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  const directIndex = normalizedTarget.indexOf(normalizedQuery);
  if (directIndex !== -1) {
    return { index: directIndex, length: normalizedQuery.length };
  }

  if (isChosungOnly(normalizedQuery)) {
    const chosungIndex = getChosung(normalizedTarget).indexOf(normalizedQuery);
    if (chosungIndex !== -1) {
      return { index: chosungIndex, length: normalizedQuery.length };
    }
  }

  return null;
}
