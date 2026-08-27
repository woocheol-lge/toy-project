const ENDPOINT = "https://api.mymemory.translated.net/get";

/** 한글 음절/자모 비율을 보고 이미 한국어인지 대략 가늠한다. */
export function looksKorean(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "") return true;

  const letters = trimmed.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return true;

  const hangul =
    trimmed.match(/[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/gu) ?? [];

  return hangul.length / letters.length >= 0.3;
}

export function parseTranslateResponse(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;

  const { responseStatus, responseData } = payload as {
    responseStatus?: unknown;
    responseData?: unknown;
  };

  if (responseStatus !== 200) return null;
  if (typeof responseData !== "object" || responseData === null) return null;

  const { translatedText } = responseData as { translatedText?: unknown };

  return typeof translatedText === "string" && translatedText.trim() !== ""
    ? translatedText
    : null;
}

/**
 * 한국어가 아닌 것으로 보이는 글을 한국어로 옮긴다.
 * 이미 한국어거나 옮기지 못하면 원문을 그대로 돌려준다. 실패해도
 * 배경 자료 표시 자체를 막지 않기 위한 최선 노력(best-effort) 동작이다.
 */
export async function translateToKorean(text: string): Promise<string> {
  if (looksKorean(text)) return text;

  try {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({ q: text, langpair: "en|ko" }).toString();

    const response = await fetch(url);
    if (!response.ok) return text;

    return parseTranslateResponse(await response.json()) ?? text;
  } catch {
    return text;
  }
}
