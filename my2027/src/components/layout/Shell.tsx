import { NavLink, useLocation } from 'react-router-dom';
import { Cloud, CloudOff, HardDrive, Menu, MoreHorizontal, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NAV } from './nav';
import { cx, Badge } from '../ui';
import { useStore } from '@/data/store';
import { appMode } from '@/lib/calc/mode';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-[11px] font-bold tracking-tight text-surface">27</div>
      <div className="leading-tight">
        <p className="text-[15px] font-bold tracking-tight">MY 2027</p>
        <p className="text-[11px] text-muted">Build a life you can sustain.</p>
      </div>
    </div>
  );
}

function SyncBadge() {
  const { sync } = useStore();
  let icon = <HardDrive size={14} />;
  let text = '이 브라우저에 저장됨';
  if (sync.local === 'unavailable' && sync.cloud !== 'synced') {
    icon = <CloudOff size={14} />;
    text = '저장소를 쓸 수 없음 — 백업을 내보내세요';
  } else if (sync.cloud === 'synced') {
    icon = <Cloud size={14} />;
    text = '클라우드에 저장됨';
  } else if (sync.cloud === 'saving') {
    icon = <Cloud size={14} />;
    text = '클라우드에 저장 중…';
  } else if (sync.cloud === 'connecting') {
    text = '이 브라우저에 저장됨 · 클라우드 연결 중';
  } else if (sync.cloud === 'error') {
    icon = <CloudOff size={14} />;
    text = '클라우드 저장 실패 · 브라우저에는 저장됨';
  }
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-muted" title={sync.error} aria-live="polite">
      {icon}
      {text}
    </p>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="주요 메뉴" className="flex flex-col gap-0.5">
      {NAV.map((n) => (
        <NavLink
          key={n.path}
          to={n.path}
          end={n.path === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx('flex min-h-[40px] items-center gap-3 rounded-lg px-3 text-sm', isActive ? 'bg-ink font-semibold text-surface' : 'text-muted hover:bg-subtle hover:text-ink')
          }
        >
          <n.icon size={17} aria-hidden />
          <span>{n.label}</span>
          <span className="ml-auto text-[11px] opacity-60">{n.ko}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { state, today } = useStore();
  const mode = appMode(today, state.profile);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Logo />
        <div className="mt-4 flex items-center gap-2">
          <Badge tone={mode.mode === 'execution' ? 'ink' : 'warning'}>{mode.label}</Badge>
          <span className="text-[11px] text-muted">{mode.detail}</span>
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavList />
        </div>
        <div className="border-t border-line pt-3">
          <SyncBadge />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Logo />
        <button className="btn-icon" onClick={() => setOpen(true)} aria-label="전체 메뉴 열기">
          <Menu size={20} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="ml-auto flex h-full w-[min(320px,86vw)] flex-col bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <Badge tone={mode.mode === 'execution' ? 'ink' : 'warning'}>{mode.label}</Badge>
              <button className="btn-icon" onClick={() => setOpen(false)} aria-label="메뉴 닫기">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-line pt-3">
              <SyncBadge />
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>

      {/* Mobile bottom navigation */}
      <nav aria-label="하단 메뉴" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.filter((n) => n.mobile).map((n) => (
          <NavLink key={n.path} to={n.path} end={n.path === '/'} className={({ isActive }) => cx('flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px]', isActive ? 'font-semibold text-ink' : 'text-muted')}>
            <n.icon size={20} aria-hidden />
            {n.ko}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] text-muted">
          <MoreHorizontal size={20} aria-hidden />
          더보기
        </button>
      </nav>
    </div>
  );
}
