"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addItem,
  canStart,
  createEmptyMeeting,
  currentElapsedSeconds,
  currentItem,
  goToNext,
  goToPrevious,
  isFirstItem,
  isLastItem,
  markReferencesFailed,
  moveItem,
  isPaused,
  pause,
  removeItem,
  resetReferences,
  resume,
  setConclusion,
  setReferences,
  startMeeting,
  totalAllocatedSeconds,
  totalElapsedSeconds,
  updateItem,
} from "./meeting-state";
import { searchReferences } from "./references";
import { clearMeeting, loadMeeting, saveMeeting } from "./storage";
import type { AgendaItem, Meeting } from "./types";

/** 초 단위 숫자가 바뀌는 순간을 놓치지 않을 만큼 자주 다시 그린다. */
const TICK_MS = 250;

export function useMeeting() {
  // 이 훅은 브라우저에서만 처음 그려지므로 저장된 회의를 바로 읽어 들인다.
  const [meeting, setMeeting] = useState<Meeting>(
    () => loadMeeting() ?? createEmptyMeeting()
  );
  const [now, setNow] = useState(() => Date.now());

  const lookedUp = useRef(new Set<string>());

  useEffect(() => {
    saveMeeting(meeting);
  }, [meeting]);

  // 아직 자료를 찾지 않은 주제를 찾아 공개 웹 문서를 붙인다.
  useEffect(() => {
    const pending = meeting.items.filter(
      (item) =>
        item.referenceStatus === "idle" &&
        item.title.trim() !== "" &&
        !lookedUp.current.has(item.id)
    );

    for (const item of pending) {
      lookedUp.current.add(item.id);

      searchReferences(item.title)
        .then((found) =>
          setMeeting((previous) => setReferences(previous, item.id, found))
        )
        .catch(() =>
          setMeeting((previous) => markReferencesFailed(previous, item.id))
        );
    }
  }, [meeting.items]);

  // 일시정지 중에도 현재 시각은 계속 흘러야 하므로 회의 중에는 늘 다시 그린다.
  useEffect(() => {
    if (meeting.phase !== "running") return;

    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);

    return () => window.clearInterval(id);
  }, [meeting.phase]);

  /** 시각이 필요한 전이는 항상 지금 시각을 기준으로 계산한다. */
  const applyWithNow = useCallback(
    (transition: (meeting: Meeting, now: number) => Meeting) => {
      const at = Date.now();
      setNow(at);
      setMeeting((previous) => transition(previous, at));
    },
    []
  );

  const item = currentItem(meeting);
  const allocated = item?.allocatedSeconds ?? 0;
  const elapsed = currentElapsedSeconds(meeting, now);
  const totalAllocated = totalAllocatedSeconds(meeting);
  const totalElapsed = totalElapsedSeconds(meeting, now);

  return {
    meeting,
    now,
    currentItem: item,
    /** 남은 시간. 배정 시간을 넘기면 0이 된다. */
    currentRemainingSeconds: Math.max(0, allocated - elapsed),
    /** 배정 시간을 넘긴 만큼의 시간. 넘기지 않았으면 0이다. */
    currentOvertimeSeconds: Math.max(0, elapsed - allocated),
    /** 이 주제에 남은 시간의 비율. 다 쓰면 0이다. */
    currentRemainingRatio:
      allocated === 0 ? 0 : Math.min(1, Math.max(0, (allocated - elapsed) / allocated)),
    totalAllocatedSeconds: totalAllocated,
    totalRemainingSeconds: Math.max(0, totalAllocated - totalElapsed),
    totalOvertimeSeconds: Math.max(0, totalElapsed - totalAllocated),
    paused: isPaused(meeting),
    firstItem: isFirstItem(meeting),
    lastItem: isLastItem(meeting),
    startable: canStart(meeting),

    addAgendaItem: (input: { title: string; allocatedSeconds?: number }) =>
      setMeeting((previous) => addItem(previous, input)),
    updateAgendaItem: (
      id: string,
      patch: Partial<Pick<AgendaItem, "title" | "allocatedSeconds">>
    ) => setMeeting((previous) => updateItem(previous, id, patch)),
    removeAgendaItem: (id: string) =>
      setMeeting((previous) => removeItem(previous, id)),
    moveAgendaItem: (id: string, direction: "up" | "down") =>
      setMeeting((previous) => moveItem(previous, id, direction)),
    lookUpReferencesAgain: (id: string) => {
      lookedUp.current.delete(id);
      setMeeting((previous) => resetReferences(previous, id));
    },

    start: () => applyWithNow(startMeeting),
    pauseTimer: () => applyWithNow(pause),
    resumeTimer: () => applyWithNow(resume),
    next: () => applyWithNow(goToNext),
    previous: () => applyWithNow(goToPrevious),
    writeConclusion: (conclusion: string) =>
      setMeeting((previous) => setConclusion(previous, conclusion)),

    reset: () => {
      lookedUp.current.clear();
      clearMeeting();
      setMeeting(createEmptyMeeting());
    },
  };
}

export type MeetingController = ReturnType<typeof useMeeting>;
