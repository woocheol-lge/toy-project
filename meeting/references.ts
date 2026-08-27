import type { Reference } from "./types";

const ENDPOINT = "https://ko.wikipedia.org/w/api.php";
const LIMIT = 3;

/** 검색 결과 요약에 섞여 오는 표시를 걷어내고 읽을 수 있는 글자만 남긴다. */
export function stripMarkup(snippet: string): string {
  return snippet
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSearchResponse(payload: unknown): Reference[] {
  if (typeof payload !== "object" || payload === null) return [];

  const query = (payload as { query?: unknown }).query;
  if (typeof query !== "object" || query === null) return [];

  const hits = (query as { search?: unknown }).search;
  if (!Array.isArray(hits)) return [];

  return hits.flatMap((hit) => {
    if (typeof hit !== "object" || hit === null) return [];

    const { pageid, title, snippet } = hit as {
      pageid?: unknown;
      title?: unknown;
      snippet?: unknown;
    };

    if (typeof pageid !== "number" || typeof title !== "string") return [];

    return [
      {
        title,
        summary: typeof snippet === "string" ? stripMarkup(snippet) : "",
        url: `https://ko.wikipedia.org/?curid=${pageid}`,
      },
    ];
  });
}

/** 주제 제목으로 공개 위키백과를 찾아 참고할 만한 문서 몇 개를 돌려준다. */
export async function searchReferences(topic: string): Promise<Reference[]> {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: topic,
    srlimit: String(LIMIT),
    format: "json",
    origin: "*",
  }).toString();

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`위키백과 검색 실패: ${response.status}`);

  return parseSearchResponse(await response.json());
}
