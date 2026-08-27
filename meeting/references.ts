import { extractKeyPhraseCandidates } from "./key-phrase";
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

async function lookupByTitle(query: string): Promise<Reference[]> {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "prefixsearch",
    gpssearch: query,
    gpslimit: "1",
    prop: "extracts|info",
    exintro: "1",
    explaintext: "1",
    exsentences: "2",
    inprop: "url",
    origin: "*",
  }).toString();

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`위키백과 검색 실패: ${response.status}`);

  return parseLookupResponse(await response.json());
}

/**
 * 주제 제목으로 위키백과에서 문서를 찾는다.
 * 본문을 훑는 검색은 낱말만 겹쳐도 걸리므로 제목으로만 찾고,
 * 찾은 문서의 첫 문단과 주소를 한 번에 가져온다.
 *
 * 주제 전체 문구로 못 찾으면, "확정"·"검토" 같은 회의용 군더더기를 걷어낸
 * 핵심어를 하나씩 다시 시도한다. 100% 일치를 요구하는 전체 문구 검색만으로는
 * "배포 일정 확정"처럼 흔한 회의 주제가 대부분 빈손으로 끝났기 때문이다.
 */
export async function searchReferences(topic: string): Promise<Reference[]> {
  const primary = await lookupByTitle(topic);
  if (primary.length > 0) return primary;

  for (const candidate of extractKeyPhraseCandidates(topic)) {
    const found = await lookupByTitle(candidate);
    if (found.length > 0) return found;
  }

  return primary;
}

/** 진행자가 직접 넣은 URL에서 제목과 설명을 가져온다. */
export async function fetchLinkPreview(url: string): Promise<Reference> {
  const response = await fetch(
    `/api/link-preview?url=${encodeURIComponent(url)}`,
  );
  if (!response.ok) throw new Error(`자료 가져오기 실패: ${response.status}`);

  return (await response.json()) as Reference;
}
