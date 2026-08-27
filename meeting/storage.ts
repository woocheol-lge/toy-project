import type { AgendaItem, Meeting } from "./types";

const STORAGE_KEY = "meeting-timer:current";

function isMeeting(value: unknown): value is Meeting {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<Meeting>;

  return (
    (candidate.phase === "setup" ||
      candidate.phase === "running" ||
      candidate.phase === "finished") &&
    Array.isArray(candidate.items) &&
    typeof candidate.currentIndex === "number" &&
    (candidate.runningSince === null || typeof candidate.runningSince === "number")
  );
}

/** 자료 항목이 없던 시절에 저장된 회의도 그대로 이어서 쓸 수 있게 채워 둔다. */
function withReferenceFields(meeting: Meeting): Meeting {
  return {
    ...meeting,
    items: meeting.items.map((item: AgendaItem) => ({
      ...item,
      references: Array.isArray(item.references) ? item.references : [],
      referenceStatus: item.referenceStatus ?? "idle",
      sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : "",
    })),
  };
}

export function saveMeeting(meeting: Meeting): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meeting));
  } catch {
    // 저장할 수 없는 환경에서도 회의는 계속 진행할 수 있어야 한다.
  }
}

export function loadMeeting(): Meeting | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);

    return isMeeting(parsed) ? withReferenceFields(parsed) : null;
  } catch {
    return null;
  }
}

export function clearMeeting(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 지우지 못해도 새 회의를 시작하는 데는 지장이 없다.
  }
}
