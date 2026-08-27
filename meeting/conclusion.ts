const LIST_MARKER = /^(?:[-*•‣▪]|\d+[.)])\s+/;

/**
 * 자유롭게 적은 논의사항에서 결론으로 삼을 마지막 문장을 뽑는다.
 * AI가 내용을 이해해 요약하는 것이 아니라, 마지막 줄(또는 마지막 문장)을
 * 그대로 가져와 목록 표시만 걷어내는 기계적인 정리다.
 */
export function summarizeConclusion(notes: string): string {
  const lines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";

  const lastLine = lines[lines.length - 1];

  const sentences = lastLine
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const lastSentence =
    sentences.length > 0 ? sentences[sentences.length - 1] : lastLine;

  return lastSentence.replace(LIST_MARKER, "").trim();
}

/**
 * 화면에 보여줄 결정사항을 정한다. 진행자가 손으로 고친 값이 있으면
 * 그 값을 쓰고, 없으면 논의사항에서 기계적으로 뽑은 결론을 쓴다.
 */
export function resolveDecision(item: {
  notes: string;
  decisionOverride: string;
}): string {
  const override = item.decisionOverride.trim();

  return override !== "" ? override : summarizeConclusion(item.notes);
}
