import type { Reference } from "./types";

const ENDPOINT = "https://ko.wikipedia.org/w/api.php";

/** 요약에 섞여 오는 표시와 군더더기 공백을 걷어낸다. */
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

/**
 * 제목이 맞는 문서 하나만 뽑아낸다.
 * 맞는 문서가 없으면 빈 목록을 준다. 어설픈 자료를 붙이는 것보다 낫다.
 */
export function parseLookupResponse(payload: unknown): Reference[] {
  if (typeof payload !== "object" || payload === null) return [];

  const query = (payload as { query?: unknown }).query;
  if (typeof query !== "object" || query === null) return [];

  const pages = (query as { pages?: unknown }).pages;
  if (typeof pages !== "object" || pages === null) return [];

  return Object.values(pages).flatMap((page) => {
    if (typeof page !== "object" || page === null) return [];

    const { title, extract, fullurl } = page as {
      title?: unknown;
      extract?: unknown;
      fullurl?: unknown;
    };

    if (typeof title !== "string" || typeof fullurl !== "string") return [];

    return [
      {
        title,
        summary: typeof extract === "string" ? stripMarkup(extract) : "",
        url: fullurl,
      },
    ];
  });
}

/**
 * 주제 제목으로 위키백과에서 문서를 찾는다.
 * 본문을 훑는 검색은 낱말만 겹쳐도 걸리므로 제목으로만 찾고,
 * 찾은 문서의 첫 문단과 주소를 한 번에 가져온다.
 */
export async function searchReferences(topic: string): Promise<Reference[]> {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "prefixsearch",
    gpssearch: topic,
    gpslimit: "1",
    prop: "extracts|info",
    exintro: "1",
    explaintext: "1",
    exsentences: "2",
    inprop: "url",
    origin: "*",
  }).toString();

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`위키백과 검색 실패: ${response.status}`);

  return parseLookupResponse(await response.json());
}

/** 진행자가 직접 넣은 URL에서 제목과 설명을 가져온다. */
export async function fetchLinkPreview(url: string): Promise<Reference> {
  const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(`자료 가져오기 실패: ${response.status}`);

  return (await response.json()) as Reference;
}
