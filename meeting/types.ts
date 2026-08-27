export type Reference = {
  title: string;
  summary: string;
  url: string;
};

/** 자료를 찾는 중(idle)이거나, 찾아 본 뒤의 상태. */
export type ReferenceStatus = "idle" | "ready" | "empty" | "failed";

export type AgendaItem = {
  id: string;
  title: string;
  /** 이 주제에 미리 정해둔 논의 시간(초). */
  allocatedSeconds: number;
  /**
   * 회의 중 자유롭게 적는 논의 기록. 비어 있을 수 있다.
   * 회의가 끝나면 이 글의 마지막 문장을 정리해 결론으로 보여준다.
   */
  notes: string;
  /** 타이머가 멈춘 시점까지 이 주제에 쌓인 시간(초). */
  elapsedSeconds: number;
  /** 주제를 이해하는 데 참고할 만한 공개 웹 문서. */
  references: Reference[];
  referenceStatus: ReferenceStatus;
  /**
   * 진행자가 직접 넣은 자료 URL. 비어 있으면 자동으로 위키백과에서 찾는다.
   * 값이 있으면 자동 검색 대신 이 주소에서 자료를 가져온다.
   */
  sourceUrl: string;
};

export type MeetingPhase = "setup" | "running" | "finished";

export type Meeting = {
  phase: MeetingPhase;
  items: AgendaItem[];
  currentIndex: number;
  /** 현재 주제가 돌기 시작한 시각(epoch ms). 멈춰 있으면 null. */
  runningSince: number | null;
};

export const DEFAULT_ALLOCATED_SECONDS = 25 * 60;
