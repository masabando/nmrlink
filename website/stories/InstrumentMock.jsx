import { createContext, useContext, useState } from 'react';

// Storybookだけで置き換える依存先。NMRControllerやWeb Serialには触れません。
const MockContext = createContext(null);
export function InstrumentMock({ locale, connection, supported, busy, activity, children }) {
  const [current, setCurrent] = useState(connection);
  const [notice, setNotice] = useState(null);
  const value = {
    locale, supported, activity: activity ? 'storybook' : null,
    state: { connection: current, busy, canConnect: current === 'disconnected', canDisconnect: current === 'connected' },
    async run(action) {
      setCurrent(action === 'connect' ? 'connected' : 'disconnected');
      return { ok: true };
    },
    setNotice,
  };
  return <MockContext.Provider value={value}>
    {children}
    <p className="mt-3 text-sm text-base-content/70" role="status">{notice ? `${locale === 'ja' ? '模擬操作' : 'Simulated action'}: ${notice.key}` : ''}</p>
  </MockContext.Provider>;
}
export function useInstrument() { return useContext(MockContext); }
