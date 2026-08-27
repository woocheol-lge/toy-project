import type { Meeting } from "./types";

/** 초를 시계 모양 문자열로 바꾼다. 한 시간을 넘으면 시간 자리를 붙인다. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(rest)}`;

  return `${pad(minutes)}:${pad(rest)}`;
}

/** 회의 중 벽시계 대신 볼 수 있도록 지금 시각을 시:분으로 보여준다. */
export function formatWallClock(at: number): string {
  const now = new Date(at);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function toMarkdown(meeting: Meeting): string {
  const body = meeting.items
    .map((item) => {
      const conclusion = item.conclusion.trim();

      return `## ${item.title}\n\n${conclusion === "" ? "_결론 없음_" : conclusion}`;
    })
    .join("\n\n");

  return `# 회의 결론\n\n${body}\n`;
}
