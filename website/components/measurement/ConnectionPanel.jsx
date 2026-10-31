"use client";

import { useInstrument } from "./InstrumentProvider";
import { messages } from "./messages";

export default function ConnectionPanel() {
  const { locale, supported, state, activity, run, setNotice } =
    useInstrument();
  const text = messages[locale];
  const locked = state.busy || Boolean(activity);
  function connect() {
    run("connect").then((result) => {
      if (result.ok) setNotice({ key: "connectDone" });
    });
  }
  function disconnect() {
    run("disconnect").then((result) => {
      if (result.ok) setNotice({ key: "disconnectDone" });
    });
  }
  return (
    <section className="card card-border bg-base-100">
      <div className="card-body gap-4">
        <h2 className="card-title">{text.connection}</h2>
        <p>{text.usb}</p>
        <div className="flex gap-2">
          <button
            className="btn"
            disabled={locked || !supported || !state.canConnect}
            onClick={connect}
          >
            {text.connect}
          </button>
          <button
            className="btn"
            disabled={locked || !state.canDisconnect}
            onClick={disconnect}
          >
            {text.disconnect}
          </button>
        </div>
        <p className="text-xs text-base-content/70">
          {supported ? text.support : text.unsupported}
        </p>
      </div>
    </section>
  );
}
