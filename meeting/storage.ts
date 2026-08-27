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
    (candidate.runningSince === null ||
      typeof candidate.runningSince === "number")
  );
}

/** 예전 모양으로 저장된 필드에 접근하기 위한 느슨한 타입. */
type LegacyAgendaItem = AgendaItem & { conclusion?: unknown };

/**
 * 예전 버전에서 저장된 회의도 그대로 이어서 쓸 수 있게 빠진 필드를 채운다.
 * "결론(conclusion)"이 "논의사항(notes)"으로 이름이 바뀐 것도 여기서 옮긴다.
 */
function withReferenceFields(meeting: Meeting): Meeting {
  return {
    ...meeting,
    items: meeting.items.map((item: LegacyAgendaItem) => ({
      ...item,
      references: Array.isArray(item.references) ? item.references : [],
      referenceStatus: item.referenceStatus ?? "idle",
      sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : "",
      decisionOverride:
        typeof item.decisionOverride === "string" ? item.decisionOverride : "",
      notes:
        typeof item.notes === "string"
          ? item.notes
          : typeof item.conclusion === "string"
            ? item.conclusion
            : "",
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
