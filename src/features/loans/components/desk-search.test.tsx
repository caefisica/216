// @vitest-environment happy-dom

import { Suspense, use, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DESK_LIST_ID } from "../constants";
import { DeskSearch } from "./desk-search";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: navigation.replace }) }));

// The search pause is far longer than any time React waits to show a list, so only `pause` ends it.
const { PAUSE_MS } = vi.hoisted(() => ({ PAUSE_MS: 60_000 }));
vi.mock("../constants", async (original) => ({
  ...(await original<typeof import("../constants")>()),
  DESK_SEARCH_DELAY_MS: PAUSE_MS,
}));

const approve = vi.fn();

const readers: Record<string, string> = { ana: "Ana G", "ana m": "Ana M", "ana ma": "Ana Ma" };

interface Page {
  query: string;
  arrived: Promise<void>;
}

/** Resolves the list of the navigation that started first and has not arrived yet. */
let arrive: () => void;
const arrivals: Array<() => void> = [];
/** A link elsewhere on the page that changes the desk's URL. */
let follow: (query: string) => void;
/** Makes the next navigation end without changing the list, as a failed one does. */
let failNext = false;

/** Animation frames wait until `flushFrames`, so no test depends on how long a frame takes. */
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;

function Desk({ page }: { page: Page }) {
  use(page.arrived);
  const reader = readers[page.query];
  return (
    <DeskSearch view="requests" query={page.query}>
      <ul id={DESK_LIST_ID}>
        <li>
          <button data-primary onClick={() => approve(reader)}>
            Aprobar {reader}
          </button>
        </li>
      </ul>
    </DeskSearch>
  );
}

/** Stands in for the server: a navigation suspends the page until `arrive` resolves it. */
function App() {
  const [page, setPage] = useState<Page>({ query: "ana", arrived: Promise.resolve() });
  follow = (query) =>
    setPage({
      query,
      arrived: new Promise<void>((resolve) => {
        arrivals.push(resolve);
        arrive = () => arrivals.shift()?.();
      }),
    });
  navigation.replace.mockImplementation((url: string) => {
    if (failNext) return;
    follow(new URL(url, "http://desk.test").searchParams.get("q") ?? "");
  });
  return (
    <Suspense fallback="cargando">
      <Desk page={page} />
    </Suspense>
  );
}

beforeEach(() => {
  approve.mockReset();
  navigation.replace.mockReset();
  failNext = false;
  arrivals.length = 0;
  frames.clear();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("DeskSearch", () => {
  const field = () => screen.getByRole("searchbox");
  const change = (text: string) => fireEvent.change(field(), { target: { value: text } });
  const submit = () => fireEvent.submit(field().closest("form")!);
  // Every event runs in an awaited act: a synchronous one leaves a suspended navigation stuck.
  const type = (text: string) =>
    act(async () => {
      change(text);
    });
  const enter = () =>
    act(async () => {
      submit();
    });
  const typeThenEnter = (text: string) =>
    act(async () => {
      change(text);
      submit();
    });
  const mount = () =>
    act(async () => {
      render(<App />);
    });
  /** The search field's pause is over, so the navigation for what was typed starts. */
  const pause = () =>
    act(async () => {
      vi.advanceTimersByTime(PAUSE_MS);
    });
  /** The server answers the oldest navigation that is still waiting; React then shows it. */
  const answer = () =>
    act(async () => {
      arrive();
      await vi.advanceTimersByTimeAsync(1000);
    });
  const settle = () => act(async () => {});
  const runFrames = () =>
    act(async () => {
      const waiting = [...frames.values()];
      frames.clear();
      for (const callback of waiting) callback(0);
    });
  const row = (reader: string) => screen.getByRole("button", { name: `Aprobar ${reader}` });

  it("acts on the single row when the list already answers the text", async () => {
    await mount();
    await enter();

    expect(approve).toHaveBeenCalledExactlyOnceWith("Ana G");
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("waits for the new list when Enter comes after the pause but before the list arrives", async () => {
    await mount();

    await type("ana m");
    await pause();
    expect(navigation.replace).toHaveBeenCalledOnce();

    await enter();
    await runFrames();
    expect(approve).not.toHaveBeenCalled();

    await answer();
    await runFrames();
    expect(approve).toHaveBeenCalledExactlyOnceWith("Ana M");
  });

  it("searches first when Enter comes before the pause", async () => {
    await mount();

    await typeThenEnter("ana m");
    expect(navigation.replace).toHaveBeenCalledOnce();
    expect(approve).not.toHaveBeenCalled();

    await answer();
    await runFrames();
    expect(approve).toHaveBeenCalledExactlyOnceWith("Ana M");
  });

  it("does not act on a list when the reader kept typing after Enter", async () => {
    await mount();

    await type("ana m");
    await pause();
    await enter();
    await type("ana ma");

    await answer();
    await runFrames();
    expect(row("Ana M")).toBeTruthy();
    expect(approve).not.toHaveBeenCalled();

    await pause();
    expect(navigation.replace).toHaveBeenCalledTimes(2);
    await answer();
    await runFrames();
    expect(row("Ana Ma")).toBeTruthy();
    expect(approve).not.toHaveBeenCalled();
  });

  it("forgets an Enter whose navigation failed", async () => {
    await mount();

    failNext = true;
    await typeThenEnter("ana m");
    expect(navigation.replace).toHaveBeenCalledOnce();
    failNext = false;
    await settle();
    expect(field()).toHaveProperty("value", "ana");

    await act(async () => follow("ana m"));
    await answer();
    await runFrames();

    expect(row("Ana M")).toBeTruthy();
    expect(approve).not.toHaveBeenCalled();
  });
});
