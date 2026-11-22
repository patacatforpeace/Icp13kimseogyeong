import { useEffect, useRef, useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { StoreProvider, useStore } from './data/store';
import { Shell } from './components/layout/Shell';
import { hashFromPath, pathFromHash } from './components/layout/nav';
import { DarkCtx } from './components/theme';
import { ToastProvider } from './components/ui';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import CalendarPage from './pages/Calendar';
import Habits from './pages/Habits';
import Health from './pages/Health';
import Finance from './pages/Finance';
import English from './pages/English';
import Journal from './pages/Journal';
import Review from './pages/Review';
import SettingsPage from './pages/Settings';

declare global {
  interface Window {
    __my2027Path?: string;
  }
}

/** Keep the address bar's #name in step with the in-app route, both ways. */
function HashSync() {
  const loc = useLocation();
  const nav = useNavigate();
  const first = useRef(true);
  window.__my2027Path = loc.pathname;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      // The hash may have changed between the first render and now: follow it instead of overwriting it.
      const fromHash = pathFromHash(location.hash);
      if (location.hash && fromHash !== loc.pathname) {
        nav(fromHash, { replace: true });
        return;
      }
    }
    const h = `#${hashFromPath(loc.pathname)}`;
    if (location.hash !== h) {
      try {
        history.replaceState(null, '', h);
      } catch {
        /* sandboxed frames may refuse */
      }
    }
    window.scrollTo(0, 0);
  }, [loc.pathname, nav]);
  useEffect(() => {
    const on = () => {
      const target = pathFromHash(location.hash);
      if (target !== window.__my2027Path) nav(target);
    };
    window.addEventListener('hashchange', on);
    on(); // catch a hash change that happened before this effect attached
    return () => window.removeEventListener('hashchange', on);
  }, [nav]);
  return null;
}

function useResolvedDark() {
  const { state } = useStore();
  const pref = state.settings.theme;
  const [sys, setSys] = useState(() => systemDark());
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSys(systemDark());
    mq.addEventListener('change', on);
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', on);
      mo.disconnect();
    };
  }, []);
  const dark = pref === 'dark' || (pref === 'system' && sys);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  return dark;
}

function systemDark() {
  const host = document.documentElement.dataset.theme; // set by the claude.ai viewer, if any
  if (host === 'dark') return true;
  if (host === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function Themed() {
  const dark = useResolvedDark();
  return (
    <DarkCtx.Provider value={dark}>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/health" element={<Health />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/english" element={<English />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/review" element={<Review />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Shell>
    </DarkCtx.Provider>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[pathFromHash(location.hash)]}>
          <HashSync />
          <Themed />
        </MemoryRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
