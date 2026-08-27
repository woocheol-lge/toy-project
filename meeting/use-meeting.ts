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
  setNotes,
  setReferences,
  startMeeting,
  totalAllocatedSeconds,
  totalElapsedSeconds,
  updateItem,
} from "./meeting-state";
import { fetchLinkPreview, searchReferences } from "./references";
import { isFetchableUrl } from "./link-preview";
import { translateToKorean } from "./translate";
import { clearMeeting, loadMeeting, saveMeeting } from "./storage";
import type { AgendaItem, Meeting, Reference } from "./types";

/** 초 단위 숫자가 바뀌는 순간을 놓치지 않을 만큼 자주 다시 그린다. */
const TICK_MS = 250;

export function useMeeting() {
  // 이 훅은 브라우저에서만 처음 그려지므로 저장된 회의를 바로 읽어 들인다.
  const [meeting, setMeeting] = useState<Meeting>(
    () => loadMeeting() ?? createEmptyMeeting(),
  );
  const [now, setNow] = useState(() => Date.now());

  const lookedUp = useRef(new Set<string>());

  useEffect(() => {
    saveMeeting(meeting);
  }, [meeting]);

  // 아직 자료를 찾지 않은 주제를 찾아 공개 웹 문서를 붙인다.
  // 진행자가 자료 URL을 직접 줬으면 그 페이지를 가져오고, 아니면 위키백과에서 찾는다.
  useEffect(() => {
    const pending = meeting.items.filter(
      (item) =>
        item.referenceStatus === "idle" &&
        item.title.trim() !== "" &&
        !lookedUp.current.has(item.id),
    );

    for (const item of pending) {
      lookedUp.current.add(item.id);
      const sourceUrl = item.sourceUrl.trim();

      const found: Promise<Reference[]> =
        sourceUrl === ""
          ? searchReferences(item.title)
          : isFetchableUrl(sourceUrl)
            ? fetchLinkPreview(sourceUrl).then((reference) => [reference])
            : Promise.reject(new Error("가져올 수 없는 주소"));

      found
        .then((references) =>
          Promise.all(
            references.map(async (reference) => ({
              ...reference,
              title: await translateToKorean(reference.title),
              summary: await translateToKorean(reference.summary),
            })),
          ),
        )
        .then((translated) =>
          setMeeting((previous) =>
            setReferences(previous, item.id, translated),
          ),
        )
        .catch(() =>
          setMeeting((previous) => markReferencesFailed(previous, item.id)),
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
    [],
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
    /** 이 주제에서 흐른 시간. 배정 시간을 넘겨도 계속 늘어난다. */
    currentElapsedSeconds: elapsed,
    /** 남은 시간. 배정 시간을 넘기면 0이 된다. */
    currentRemainingSeconds: Math.max(0, allocated - elapsed),
    /** 배정 시간을 넘긴 만큼의 시간. 넘기지 않았으면 0이다. */
    currentOvertimeSeconds: Math.max(0, elapsed - allocated),
    /** 이 주제에 남은 시간의 비율. 다 쓰면 0이다. */
    currentRemainingRatio:
      allocated === 0
        ? 0
        : Math.min(1, Math.max(0, (allocated - elapsed) / allocated)),
    totalAllocatedSeconds: totalAllocated,
    totalRemainingSeconds: Math.max(0, totalAllocated - totalElapsed),
    totalOvertimeSeconds: Math.max(0, totalElapsed - totalAllocated),
    paused: isPaused(meeting),
    firstItem: isFirstItem(meeting),
    lastItem: isLastItem(meeting),
    startable: canStart(meeting),

    addAgendaItem: (input: {
      title: string;
      allocatedSeconds?: number;
      sourceUrl?: string;
    }) => setMeeting((previous) => addItem(previous, input)),
    updateAgendaItem: (
      id: string,
      patch: Partial<Pick<AgendaItem, "title" | "allocatedSeconds">>,
    ) => setMeeting((previous) => updateItem(previous, id, patch)),
    removeAgendaItem: (id: string) =>
      setMeeting((previous) => removeItem(previous, id)),
    moveAgendaItem: (id: string, direction: "up" | "down") =>
      setMeeting((previous) => moveItem(previous, id, direction)),
    lookUpReferencesAgain: (id: string) => {
      lookedUp.current.delete(id);
      setMeeting((previous) => resetReferences(previous, id));
    },
    /** 자료 URL을 바꾸면 그 주소를 다시 가져오도록 조회 상태를 초기화한다. */
    setAgendaItemSourceUrl: (id: string, sourceUrl: string) => {
      lookedUp.current.delete(id);
      setMeeting((previous) =>
        resetReferences(updateItem(previous, id, { sourceUrl }), id),
      );
    },

    start: () => applyWithNow(startMeeting),
    pauseTimer: () => applyWithNow(pause),
    resumeTimer: () => applyWithNow(resume),
    next: () => applyWithNow(goToNext),
    previous: () => applyWithNow(goToPrevious),
    writeNotes: (notes: string) =>
      setMeeting((previous) => setNotes(previous, notes)),

    reset: () => {
      lookedUp.current.clear();
      clearMeeting();
      setMeeting(createEmptyMeeting());
    },
  };
}

export type MeetingController = ReturnType<typeof useMeeting>;
