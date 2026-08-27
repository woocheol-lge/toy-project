import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { MeetingScreens } from "./meeting-screens";

function wikipediaReply(title: string | null) {
  return {
    ok: true,
    json: async () =>
      title === null
        ? { batchcomplete: "" }
        : {
            query: {
              pages: {
                "1": {
                  pageid: 1,
                  title,
                  extract: `${title} 요약`,
                  fullurl: `https://ko.wikipedia.org/wiki/${title}`,
                },
              },
            },
          },
  } as Response;
}

beforeEach(() => {
  window.localStorage.clear();
  // 검사에서 실제 위키백과를 부르지 않는다.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => wikipediaReply(null)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function addAgendaItem(title: string, minutes: string, sourceUrl?: string) {
  fireEvent.change(screen.getByLabelText("주제 제목"), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText("주제 시간(분)"), {
    target: { value: minutes },
  });
  if (sourceUrl !== undefined) {
    fireEvent.change(screen.getByLabelText("자료 URL"), {
      target: { value: sourceUrl },
    });
  }
  fireEvent.click(screen.getByRole("button", { name: "주제 추가" }));
}

test("주제가 없으면 회의를 시작할 수 없다", () => {
  render(<MeetingScreens />);

  expect(
    screen.getByRole("heading", { level: 1, name: "포모도로 미팅 타이머" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "회의 시작" })).toBeDisabled();
});

test("주제를 등록하고 회의를 시작하면 첫 주제와 남은 시간이 보인다", () => {
  render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");

  const start = screen.getByRole("button", { name: "회의 시작" });
  expect(start).toBeEnabled();
  fireEvent.click(start);

  expect(
    screen.getByRole("heading", { level: 1, name: "배포 일정" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("남은 시간")).toHaveTextContent("10:00");
});

test("결론을 적고 마치면 종료 화면에 그 결론이 남는다", () => {
  render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");
  fireEvent.click(screen.getByRole("button", { name: "회의 시작" }));

  fireEvent.change(screen.getByLabelText("이 주제의 결론"), {
    target: { value: "다음 주 화요일 배포로 확정" },
  });
  fireEvent.click(screen.getByRole("button", { name: /회의 마치기/ }));

  expect(
    screen.getByRole("heading", { level: 1, name: "회의 결론" }),
  ).toBeInTheDocument();
  expect(screen.getByText("다음 주 화요일 배포로 확정")).toBeInTheDocument();
});

test("결론을 비운 채 마치면 종료 화면에서 결론 없음으로 구분된다", () => {
  render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");
  fireEvent.click(screen.getByRole("button", { name: "회의 시작" }));
  fireEvent.click(screen.getByRole("button", { name: /회의 마치기/ }));

  expect(screen.getByText("결론 없음")).toBeInTheDocument();
});

test("진행 중인 회의는 다시 그려도 이어서 보인다", () => {
  const first = render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");
  fireEvent.click(screen.getByRole("button", { name: "회의 시작" }));
  fireEvent.change(screen.getByLabelText("이 주제의 결론"), {
    target: { value: "작성 중인 결론" },
  });
  first.unmount();

  render(<MeetingScreens />);

  expect(
    screen.getByRole("heading", { level: 1, name: "배포 일정" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("이 주제의 결론")).toHaveValue("작성 중인 결론");
});

test("주제를 등록하면 찾은 자료를 주제 아래에 보여준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => wikipediaReply("스크럼 (소프트웨어 개발)")),
  );

  render(<MeetingScreens />);
  addAgendaItem("스크럼 회고", "10");

  expect(
    await screen.findByText("스크럼 (소프트웨어 개발)"),
  ).toBeInTheDocument();
  expect(screen.getByText("스크럼 (소프트웨어 개발) 요약")).toBeInTheDocument();
});

test("자료를 가져오지 못하면 다시 찾을 수 있다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("네트워크 없음");
    }),
  );

  render(<MeetingScreens />);
  addAgendaItem("배포 일정", "10");

  expect(
    await screen.findByText("자료를 가져오지 못했습니다."),
  ).toBeInTheDocument();

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => wikipediaReply("소프트웨어 배포")),
  );
  fireEvent.click(screen.getByRole("button", { name: "다시 찾기" }));

  expect(await screen.findByText("소프트웨어 배포")).toBeInTheDocument();
});

test("찾은 자료가 없으면 없다고 알려준다", async () => {
  render(<MeetingScreens />);
  addAgendaItem("사내 전용 용어", "10");

  await waitFor(() =>
    expect(
      screen.getByText("위키백과에 이 주제로 된 문서가 없습니다."),
    ).toBeInTheDocument(),
  );
});

test("새 회의 준비를 누르면 확인을 받고, 취소하면 결론이 남는다", async () => {
  render(<MeetingScreens />);
  addAgendaItem("배포 일정 확정", "10");
  fireEvent.click(screen.getByRole("button", { name: "회의 시작" }));
  fireEvent.click(screen.getByRole("button", { name: /회의 마치기/ }));

  fireEvent.click(screen.getByRole("button", { name: "새 회의 준비" }));

  expect(
    screen.getByText("정말 새 회의를 시작하시겠습니까?"),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "취소" }));

  expect(
    screen.getByRole("heading", { level: 1, name: "회의 결론" }),
  ).toBeInTheDocument();
});

test("확인 창에서 승낙하면 결론이 사라지고 준비 화면으로 돌아간다", async () => {
  render(<MeetingScreens />);
  addAgendaItem("배포 일정 확정", "10");
  fireEvent.click(screen.getByRole("button", { name: "회의 시작" }));
  fireEvent.click(screen.getByRole("button", { name: /회의 마치기/ }));

  fireEvent.click(screen.getByRole("button", { name: "새 회의 준비" }));
  fireEvent.click(screen.getByRole("button", { name: "새 회의 시작" }));

  expect(
    screen.getByRole("heading", { level: 1, name: "포모도로 미팅 타이머" }),
  ).toBeInTheDocument();
  expect(screen.getByText("아직 등록한 주제가 없습니다.")).toBeInTheDocument();
});

function linkPreviewReply(
  ok: boolean,
  body?: { title: string; summary: string; url: string },
) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => body ?? { error: "가져올 수 없는 주소입니다." },
  } as Response;
}

test("자료 URL을 넣으면 그 페이지에서 가져온 자료가 보인다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/link-preview")) {
        return linkPreviewReply(true, {
          title: "배포 체크리스트",
          summary: "배포 전 확인할 항목을 정리한 문서입니다.",
          url: "https://example.com/checklist",
        });
      }
      return wikipediaReply(null);
    }),
  );

  render(<MeetingScreens />);
  addAgendaItem("배포 일정 확정", "10", "https://example.com/checklist");

  expect(await screen.findByText("배포 체크리스트")).toBeInTheDocument();
  expect(
    screen.getByText("배포 전 확인할 항목을 정리한 문서입니다."),
  ).toBeInTheDocument();
  expect(screen.getByText("추가 정보")).toBeInTheDocument();
});

test("자료 URL을 가져오지 못하면 다시 찾을 수 있고, 성공하면 자료로 바뀐다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/link-preview")) return linkPreviewReply(false);
      return wikipediaReply(null);
    }),
  );

  render(<MeetingScreens />);
  addAgendaItem("배포 일정 확정", "10", "https://example.com/broken");

  expect(
    await screen.findByText("넣어 둔 URL에서 자료를 가져오지 못했습니다."),
  ).toBeInTheDocument();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/link-preview")) {
        return linkPreviewReply(true, {
          title: "복구된 문서",
          summary: "이번엔 성공했다.",
          url: "https://example.com/broken",
        });
      }
      return wikipediaReply(null);
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "다시 찾기" }));

  expect(await screen.findByText("복구된 문서")).toBeInTheDocument();
});

test("주제를 등록한 뒤에도 자료 URL을 넣으면 자동 검색 대신 그 자료로 바뀐다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/link-preview")) {
        return linkPreviewReply(true, {
          title: "나중에 넣은 자료",
          summary: "회의 준비 중에 추가했다.",
          url: "https://example.com/later",
        });
      }
      return wikipediaReply("엉뚱한 위키 문서");
    }),
  );

  render(<MeetingScreens />);
  addAgendaItem("배포 일정 확정", "10");

  expect(await screen.findByText("엉뚱한 위키 문서")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("1번 주제 자료 URL"), {
    target: { value: "https://example.com/later" },
  });
  fireEvent.blur(screen.getByLabelText("1번 주제 자료 URL"));

  expect(await screen.findByText("나중에 넣은 자료")).toBeInTheDocument();
  expect(screen.queryByText("엉뚱한 위키 문서")).not.toBeInTheDocument();
});

test("URL에서 가져온 영어 자료는 한국어로 번역되어 보인다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/link-preview")) {
        return linkPreviewReply(true, {
          title: "Build software better, together",
          summary: "GitHub is where people build software.",
          url: "https://example.com/",
        });
      }
      if (url.includes("mymemory.translated.net")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        const translated = query.startsWith("Build")
          ? "함께 소프트웨어를 더 잘 만드세요"
          : "깃허브는 사람들이 소프트웨어를 만드는 곳입니다.";
        return {
          ok: true,
          json: async () => ({
            responseStatus: 200,
            responseData: { translatedText: translated },
          }),
        } as Response;
      }
      return wikipediaReply(null);
    }),
  );

  render(<MeetingScreens />);
  addAgendaItem("깃허브 소개", "10", "https://example.com/");

  expect(
    await screen.findByText("함께 소프트웨어를 더 잘 만드세요"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("깃허브는 사람들이 소프트웨어를 만드는 곳입니다."),
  ).toBeInTheDocument();
});
