"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  NMRController,
  runFrequencySweep,
  runPulseSweep,
  runT1Sweep,
  runT2Sweep,
} from "../../../packages/nmrlink/src/index.js";

const scanRunners = {
  frequency: { runner: runFrequencySweep, operation: "sweep" },
  pulse: { runner: runPulseSweep, operation: "pulseSweep" },
  t1: { runner: runT1Sweep, operation: "t1Sweep" },
  t2: { runner: runT2Sweep, operation: "t2Sweep" },
};
const InstrumentContext = createContext(null);
const disconnected = {
  connection: "disconnected",
  busy: false,
  canConnect: false,
  canDisconnect: false,
  canMeasure: false,
};

// /ui/配下のページ移動ではこのProviderを作り直しません。
// 接続とページ別の入力・結果はメモリ内で保持し、リロード時には破棄します。
export function InstrumentProvider({ children }) {
  const pathname = usePathname();
  const segment = pathname.replace(/\/$/, "").split("/").at(-1);
  const page = ["frequency", "pulse", "t1", "t2"].includes(segment)
    ? segment
    : "standard";
  const [locale, setLocale] = useState("ja");
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState(disconnected);
  const [record, setRecord] = useState(null);
  const [pages, setPages] = useState({});
  const [activity, setActivity] = useState(null);
  const [stopping, setStopping] = useState(false);
  const instrument = useRef(null),
    pending = useRef(Promise.resolve()),
    sweepAbort = useRef(null);
  const activePage = useRef(page),
    operationPage = useRef(page);

  const setPageNotice = useCallback((name, notice) => {
    setPages((current) => ({
      ...current,
      [name]: { ...current[name], notice },
    }));
  }, []);
  const setNotice = useCallback(
    (notice) => setPageNotice(page, notice),
    [page, setPageNotice],
  );

  useEffect(() => {
    activePage.current = page;
  }, [page]);
  useEffect(() => {
    const query = new URLSearchParams(location.search).get("lang");
    let saved;
    try {
      saved = localStorage.getItem("nmrlink-ui-language");
    } catch {
      /* Storage may be unavailable. */
    }
    const selected = ["ja", "en"].includes(query)
      ? query
      : ["ja", "en"].includes(saved)
        ? saved
        : "ja";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser preferences are unavailable during static rendering.
    setLocale(selected);
    setSupported(window.isSecureContext && "serial" in navigator);
    const controller = new NMRController();
    instrument.current = controller;
    const stop = [
      controller.onStateChange(setState),
      controller.onError((error) =>
        setPageNotice(operationPage.current, { key: "error", error }),
      ),
      controller.onResult((value) => {
        setRecord({ value, fromFile: false });
        setPageNotice("standard", { key: "done" });
      }),
    ];
    return () => {
      stop.forEach((unsubscribe) => unsubscribe());
      instrument.current = null;
      // 測定を中断せず、完了後に接続と監視を解放します。
      pending.current.finally(async () => {
        if (controller.state.canDisconnect) await controller.disconnect();
        controller.dispose();
      });
    };
  }, [setPageNotice]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    const beforeUnload = (event) => {
      if (state.connection !== "disconnected" || state.busy || activity) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [state, activity]);

  function changeLocale(value) {
    if (!["ja", "en"].includes(value)) return;
    setLocale(value);
    try {
      localStorage.setItem("nmrlink-ui-language", value);
    } catch {
      /* Keep in-memory choice. */
    }
    const url = new URL(location.href);
    url.searchParams.set("lang", value);
    history.replaceState(history.state, "", url);
  }
  function run(operation, ...args) {
    const controller = instrument.current;
    if (!controller || sweepAbort.current || activity)
      return Promise.resolve({ ok: false });
    operationPage.current = activePage.current;
    // connect()はクリック内で同期的に呼び、ポート選択のユーザー操作を維持します。
    const task = controller[operation](...args);
    pending.current = task;
    return task;
  }
  function scan(kind, parameters, options, demoDevice = null) {
    const controller = instrument.current;
    if (!controller || controller.state.busy || sweepAbort.current || activity)
      return Promise.resolve({ ok: false });
    operationPage.current = kind;
    const abort = new AbortController();
    sweepAbort.current = abort;
    setActivity(kind);
    setStopping(false);
    const settings = { ...options, signal: abort.signal };
    const { runner, operation } = scanRunners[kind];
    const task = demoDevice
      ? runner(demoDevice, parameters, settings).then(
          (value) => ({ ok: true, value }),
          (error) => ({ ok: false, error }),
        )
      : controller[operation](parameters, settings);
    const finished = task.finally(() => {
      sweepAbort.current = null;
      setActivity(null);
      setStopping(false);
    });
    pending.current = finished;
    return finished;
  }
  function scanFrequency(parameters, options, demoDevice = null) {
    return scan("frequency", parameters, options, demoDevice);
  }
  function scanPulse(parameters, options, demoDevice = null) {
    return scan("pulse", parameters, options, demoDevice);
  }
  function scanT1(parameters, options, demoDevice = null) {
    return scan("t1", parameters, options, demoDevice);
  }
  function scanT2(parameters, options, demoDevice = null) {
    return scan("t2", parameters, options, demoDevice);
  }
  function stopScan() {
    if (sweepAbort.current) {
      sweepAbort.current.abort();
      setStopping(true);
    }
  }

  const notice = pages[page]?.notice ?? {
    key: page === "standard" ? "idle" : `${page}Idle`,
  };
  return (
    <InstrumentContext.Provider
      value={{
        locale,
        changeLocale,
        supported,
        state,
        record,
        setRecord,
        notice,
        setNotice,
        run,
        scanFrequency,
        scanPulse,
        scanT1,
        scanT2,
        stopScan,
        stopping,
        activity,
        setActivity,
        page,
        pages,
        setPages,
      }}
    >
      {children}
    </InstrumentContext.Provider>
  );
}
export function useInstrument() {
  return useContext(InstrumentContext);
}

// ページがアンマウントされても入力値と結果を残します。永続ストレージには保存しません。
export function useSessionField(page, field, initial) {
  const { pages, setPages } = useInstrument();
  const value = Object.hasOwn(pages[page] ?? {}, field)
    ? pages[page][field]
    : initial;
  const setValue = useCallback(
    (next) => {
      setPages((current) => {
        const fields = current[page] ?? {};
        const before = Object.hasOwn(fields, field) ? fields[field] : initial;
        return {
          ...current,
          [page]: {
            ...fields,
            [field]: typeof next === "function" ? next(before) : next,
          },
        };
      });
    },
    [page, field, initial, setPages],
  );
  return [value, setValue];
}
