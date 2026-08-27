/**
 * 위키백과 검색에서 걸러 봤을 때 뜻을 좁혀 주지 못하는, 회의 주제에
 * 흔히 붙는 말들. 실제 주제(대한민국·남해회사처럼 엉뚱한 결과를 낳던
 * "배포 일정 확정" 등)로 확인해 골랐다.
 */
const MEETING_FILLER_WORDS = new Set([
  "회의",
  "논의",
  "관련",
  "확정",
  "진행",
  "상황",
  "검토",
  "계획",
  "정리",
  "대응",
  "점검",
  "공유",
  "안내",
  "보고",
  "제안",
  "결정",
  "협의",
  "예정",
  "완료",
  "여부",
  "방안",
  "방향",
  "사항",
  "결과",
  "일정",
  "준비",
  "신규",
  "다음",
  "이번",
  "지난",
  "금주",
  "차주",
  "오늘",
  "내일",
]);

/**
 * 주제 전체 문구로 자료를 찾지 못했을 때 하나씩 다시 시도해 볼 핵심어
 * 후보를 뽑는다. 여러 단어를 한꺼번에 합쳐 재시도하면(예: "분기 로드맵")
 * 여전히 찾지 못하는 경우가 많아, 군더더기를 걷어낸 단어를 하나씩
 * 후보로 준다. 긴 단어일수록 구체적인 명사일 가능성이 높아 먼저 시도한다.
 * 걸러낼 말이 없거나 전부 걸러지면 다시 시도할 가치가 없어 빈 배열을 준다.
 */
export function extractKeyPhraseCandidates(topic: string): string[] {
  const words = topic.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // 한 글자짜리 말은 그 자체로 뜻이 좁혀지지 않아 후보에서 뺀다.
  const kept = words.filter(
    (word) => word.length > 1 && !MEETING_FILLER_WORDS.has(word),
  );
  if (kept.length === 0 || kept.length === words.length) return [];

  return [...kept].sort((a, b) => b.length - a.length);
}
