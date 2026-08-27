import {
  DEFAULT_ALLOCATED_SECONDS,
  type AgendaItem,
  type Meeting,
  type Reference,
} from "./types";

function createId() {
  return `item-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyMeeting(): Meeting {
  return { phase: "setup", items: [], currentIndex: 0, runningSince: null };
}

export function addItem(
  meeting: Meeting,
  input: { title: string; allocatedSeconds?: number; sourceUrl?: string }
): Meeting {
  const item: AgendaItem = {
    id: createId(),
    title: input.title,
    allocatedSeconds: input.allocatedSeconds ?? DEFAULT_ALLOCATED_SECONDS,
    conclusion: "",
    elapsedSeconds: 0,
    references: [],
    referenceStatus: "idle",
    sourceUrl: input.sourceUrl ?? "",
  };

  return { ...meeting, items: [...meeting.items, item] };
}

export function updateItem(
  meeting: Meeting,
  id: string,
  patch: Partial<Pick<AgendaItem, "title" | "allocatedSeconds" | "sourceUrl">>
): Meeting {
  return {
    ...meeting,
    items: meeting.items.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    ),
  };
}

export function removeItem(meeting: Meeting, id: string): Meeting {
  return { ...meeting, items: meeting.items.filter((item) => item.id !== id) };
}

/** 주제 순서는 회의를 시작하기 전에만 바꾼다. */
export function moveItem(
  meeting: Meeting,
  id: string,
  direction: "up" | "down"
): Meeting {
  if (meeting.phase !== "setup") return meeting;

  const from = meeting.items.findIndex((item) => item.id === id);
  if (from === -1) return meeting;

  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= meeting.items.length) return meeting;

  const items = [...meeting.items];
  [items[from], items[to]] = [items[to], items[from]];

  return { ...meeting, items };
}

function patchItem(
  meeting: Meeting,
  id: string,
  patch: Partial<AgendaItem>
): Meeting {
  return {
    ...meeting,
    items: meeting.items.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    ),
  };
}

/** 자료를 처음부터 다시 찾도록 되돌린다. */
export function resetReferences(meeting: Meeting, id: string): Meeting {
  return patchItem(meeting, id, { references: [], referenceStatus: "idle" });
}

export function setReferences(
  meeting: Meeting,
  id: string,
  references: Reference[]
): Meeting {
  return patchItem(meeting, id, {
    references,
    referenceStatus: references.length === 0 ? "empty" : "ready",
  });
}

export function markReferencesFailed(meeting: Meeting, id: string): Meeting {
  return patchItem(meeting, id, { references: [], referenceStatus: "failed" });
}

export function canStart(meeting: Meeting): boolean {
  return meeting.items.length > 0;
}

export function startMeeting(meeting: Meeting, now: number): Meeting {
  if (!canStart(meeting)) return meeting;

  return { ...meeting, phase: "running", currentIndex: 0, runningSince: now };
}

export function currentItem(meeting: Meeting): AgendaItem | undefined {
  return meeting.items[meeting.currentIndex];
}

/** 돌고 있던 시간을 현재 주제에 확정하고 타이머를 멈춘 상태를 만든다. */
function commitRunningTime(meeting: Meeting, now: number): Meeting {
  if (meeting.runningSince === null) return meeting;

  const ran = Math.max(0, Math.floor((now - meeting.runningSince) / 1000));

  return {
    ...meeting,
    items: meeting.items.map((item, index) =>
      index === meeting.currentIndex
        ? { ...item, elapsedSeconds: item.elapsedSeconds + ran }
        : item
    ),
    runningSince: null,
  };
}

export function pause(meeting: Meeting, now: number): Meeting {
  return commitRunningTime(meeting, now);
}

export function resume(meeting: Meeting, now: number): Meeting {
  if (meeting.phase !== "running" || meeting.runningSince !== null) {
    return meeting;
  }

  return { ...meeting, runningSince: now };
}

export function isPaused(meeting: Meeting): boolean {
  return meeting.phase === "running" && meeting.runningSince === null;
}

export function isLastItem(meeting: Meeting): boolean {
  return meeting.currentIndex >= meeting.items.length - 1;
}

export function isFirstItem(meeting: Meeting): boolean {
  return meeting.currentIndex <= 0;
}

export function goToNext(meeting: Meeting, now: number): Meeting {
  if (meeting.phase !== "running") return meeting;

  const wasRunning = meeting.runningSince !== null;
  const committed = commitRunningTime(meeting, now);

  if (isLastItem(meeting)) {
    return { ...committed, phase: "finished", runningSince: null };
  }

  return {
    ...committed,
    currentIndex: committed.currentIndex + 1,
    runningSince: wasRunning ? now : null,
  };
}

export function goToPrevious(meeting: Meeting, now: number): Meeting {
  if (meeting.phase !== "running" || isFirstItem(meeting)) return meeting;

  const wasRunning = meeting.runningSince !== null;
  const committed = commitRunningTime(meeting, now);

  return {
    ...committed,
    currentIndex: committed.currentIndex - 1,
    runningSince: wasRunning ? now : null,
  };
}

export function setConclusion(meeting: Meeting, conclusion: string): Meeting {
  return {
    ...meeting,
    items: meeting.items.map((item, index) =>
      index === meeting.currentIndex ? { ...item, conclusion } : item
    ),
  };
}

/** 멈춰 있으면 확정된 시간만, 돌고 있으면 흐른 시간까지 더해 돌려준다. */
function runningExtraSeconds(meeting: Meeting, now: number): number {
  if (meeting.runningSince === null) return 0;

  return Math.max(0, Math.floor((now - meeting.runningSince) / 1000));
}

export function currentElapsedSeconds(meeting: Meeting, now: number): number {
  const item = currentItem(meeting);
  if (!item) return 0;

  return item.elapsedSeconds + runningExtraSeconds(meeting, now);
}

export function totalAllocatedSeconds(meeting: Meeting): number {
  return meeting.items.reduce((sum, item) => sum + item.allocatedSeconds, 0);
}

export function totalElapsedSeconds(meeting: Meeting, now: number): number {
  const committed = meeting.items.reduce(
    (sum, item) => sum + item.elapsedSeconds,
    0
  );

  return committed + runningExtraSeconds(meeting, now);
}
