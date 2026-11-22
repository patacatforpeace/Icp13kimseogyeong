import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Repeat as RepeatIcon } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Check, Empty, Field, Input, Modal, PageHeader, Segmented, Select, Textarea, cx, useToast } from '@/components/ui';
import { EVENT_CATEGORIES } from '@/data/seed';
import { occurrencesInRange, type Occurrence } from '@/lib/calc/calendar';
import { addDaysISO, addMonthsYM, fmtDate, fmtDateLong, fmtMonth, fmtShort, isValidISO, monthGrid, monthOf, weekStartISO, weekdayKo } from '@/lib/date';
import { uid } from '@/lib/format';
import { toggleOccurrence } from '@/data/actions';
import type { CalendarEvent, EventCategory, Repeat } from '@/data/types';

type View = 'month' | 'week' | 'day';
const REPEAT_LABEL: Record<Repeat, string> = { none: '반복 없음', daily: '매일', weekly: '매주', monthly: '매월' };
const catLabel = (c: EventCategory) => EVENT_CATEGORIES.find((x) => x.key === c)?.label ?? c;

export default function CalendarPage() {
  const { state, update, today } = useStore();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(today);
  const [editing, setEditing] = useState<{ event: CalendarEvent; date: string; isNew: boolean } | null>(null);
  const [filter, setFilter] = useState<EventCategory | 'all'>('all');

  const events = filter === 'all' ? state.events : state.events.filter((e) => e.category === filter);

  const move = (dir: number) => {
    if (view === 'month') setCursor(`${addMonthsYM(monthOf(cursor), dir)}-01`);
    else setCursor(addDaysISO(cursor, dir * (view === 'week' ? 7 : 1)));
  };

  const newEvent = (date: string) =>
    setEditing({ isNew: true, date, event: { id: uid(), title: '', date, category: 'personal', repeat: 'none', note: '', completed: [], skipped: [] } });

  const title = view === 'month' ? fmtMonth(monthOf(cursor)) : view === 'week' ? `${fmtDate(weekStartISO(cursor))} – ${fmtShort(addDaysISO(weekStartISO(cursor), 6))}` : fmtDateLong(cursor);

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="일정, 반복 루틴, 완료 체크를 관리합니다."
        action={
          <Button variant="primary" onClick={() => newEvent(cursor)}>
            <Plus size={16} /> 일정 추가
          </Button>
        }
      />
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1">
            <button className="btn-icon" onClick={() => move(-1)} aria-label="이전">
              <ChevronLeft size={18} />
            </button>
            <button className="btn-icon" onClick={() => move(1)} aria-label="다음">
              <ChevronRight size={18} />
            </button>
            <h2 className="num ml-1 text-base font-semibold">{title}</h2>
            <button className="btn btn-ghost ml-1 min-h-[32px] text-xs" onClick={() => setCursor(today)}>
              오늘
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label="카테고리 필터" className="w-auto py-1" value={filter} onChange={(e) => setFilter(e.target.value as EventCategory | 'all')}>
              <option value="all">전체 카테고리</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Segmented label="보기" value={view} onChange={setView} options={[{ value: 'month', label: '월' }, { value: 'week', label: '주' }, { value: 'day', label: '일' }]} />
          </div>
        </div>

        {view === 'month' && <MonthView cursor={cursor} today={today} events={events} onPickDay={(d) => { setCursor(d); setView('day'); }} />}
        {view !== 'month' && (
          <ListView
            from={view === 'week' ? weekStartISO(cursor) : cursor}
            days={view === 'week' ? 7 : 1}
            today={today}
            events={events}
            onToggle={(o) => update((s) => toggleOccurrence(s, o.event.id, o.date))}
            onEdit={(o) => setEditing({ event: o.event, date: o.date, isNew: false })}
            onAdd={newEvent}
          />
        )}
      </div>

      {editing && <EventModal key={editing.event.id + editing.date} {...editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function MonthView({ cursor, today, events, onPickDay }: { cursor: string; today: string; events: CalendarEvent[]; onPickDay: (d: string) => void }) {
  const m = monthOf(cursor);
  const grid = monthGrid(m);
  const occ = occurrencesInRange(events, grid[0], grid[41]);
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line text-center text-xs text-muted">
        {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((d) => {
          const items = occ.filter((o) => o.date === d);
          const inMonth = monthOf(d) === m;
          return (
            <button
              key={d}
              onClick={() => onPickDay(d)}
              aria-label={`${fmtDateLong(d)} 일정 ${items.length}개`}
              className={cx('flex min-h-[64px] flex-col items-stretch gap-0.5 border-b border-r border-line p-1 text-left hover:bg-subtle sm:min-h-[104px] sm:p-1.5 [&:nth-child(7n)]:border-r-0', !inMonth && 'bg-subtle/50 text-muted/60')}
            >
              <span className={cx('num mb-0.5 inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs', d === today && 'bg-ink font-semibold text-surface')}>{Number(d.slice(8))}</span>
              <span className="hidden flex-col gap-0.5 sm:flex">
                {items.slice(0, 3).map((o) => (
                  <span key={o.event.id} className={cx('truncate rounded px-1 py-0.5 text-[11px]', o.done ? 'text-muted line-through' : 'bg-subtle')}>
                    {o.event.title}
                  </span>
                ))}
                {items.length > 3 && <span className="px-1 text-[11px] text-muted">+{items.length - 3}</span>}
              </span>
              <span className="flex flex-wrap gap-0.5 sm:hidden">
                {items.slice(0, 4).map((o) => (
                  <i key={o.event.id} className={cx('h-1.5 w-1.5 rounded-full', o.done ? 'bg-muted/40' : 'bg-ink')} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ from, days, today, events, onToggle, onEdit, onAdd }: { from: string; days: number; today: string; events: CalendarEvent[]; onToggle: (o: Occurrence) => void; onEdit: (o: Occurrence) => void; onAdd: (d: string) => void }) {
  const to = addDaysISO(from, days - 1);
  const occ = occurrencesInRange(events, from, to);
  return (
    <ol className="divide-y divide-line">
      {Array.from({ length: days }, (_, i) => addDaysISO(from, i)).map((d) => {
        const items = occ.filter((o) => o.date === d);
        return (
          <li key={d} className={cx('px-4 py-3', d === today && 'bg-subtle/60')}>
            <div className="mb-1 flex items-center justify-between">
              <p className={cx('num text-sm', d === today ? 'font-semibold' : 'text-muted')}>
                {fmtShort(d)} ({weekdayKo(d)}) {d === today && <span className="ml-1 text-xs">오늘</span>}
              </p>
              <button className="btn btn-ghost min-h-[32px] px-2 text-xs" onClick={() => onAdd(d)} aria-label={`${fmtDate(d)}에 일정 추가`}>
                <Plus size={14} /> 추가
              </button>
            </div>
            {items.length === 0 ? (
              days === 1 ? <Empty title="일정이 없어요" /> : <p className="text-sm text-muted/70">—</p>
            ) : (
              <ul>
                {items.map((o) => (
                  <li key={o.event.id} className="flex items-center gap-3 py-1.5">
                    <Check checked={o.done} onChange={() => onToggle(o)} label={`${o.event.title} 완료`} />
                    <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onEdit(o)}>
                      {o.event.time && <span className="num text-xs text-muted">{o.event.time}</span>}
                      <span className={cx('truncate text-sm', o.done && 'text-muted line-through')}>{o.event.title}</span>
                      {o.event.repeat !== 'none' && <RepeatIcon size={12} className="shrink-0 text-muted" aria-label="반복 일정" />}
                    </button>
                    <span className="chip">{catLabel(o.event.category)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function EventModal({ event, date, isNew, onClose }: { event: CalendarEvent; date: string; isNew: boolean; onClose: () => void }) {
  const { update } = useStore();
  const toast = useToast();
  const [f, setF] = useState(event);
  const [err, setErr] = useState<Record<string, string>>({});
  const set = <K extends keyof CalendarEvent>(k: K, v: CalendarEvent[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = () => {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = '제목을 입력하세요';
    if (!isValidISO(f.date)) e.date = '날짜를 확인하세요';
    if (f.repeatUntil && (!isValidISO(f.repeatUntil) || f.repeatUntil < f.date)) e.repeatUntil = '반복 종료일은 시작일 이후여야 합니다';
    setErr(e);
    if (Object.keys(e).length) return;
    update((s) => {
      const i = s.events.findIndex((x) => x.id === f.id);
      const clean = { ...f, title: f.title.trim(), repeatUntil: f.repeat === 'none' ? undefined : f.repeatUntil || undefined };
      if (i >= 0) s.events[i] = clean;
      else s.events.push(clean);
    });
    toast(isNew ? '일정을 추가했어요' : '일정을 저장했어요');
    onClose();
  };

  const removeAll = () => {
    update((s) => void (s.events = s.events.filter((x) => x.id !== f.id)));
    toast('일정을 삭제했어요');
    onClose();
  };
  const removeOne = () => {
    update((s) => {
      const e = s.events.find((x) => x.id === f.id);
      if (e) e.skipped = [...e.skipped, date];
    });
    toast(`${fmtDate(date)} 일정만 삭제했어요`);
    onClose();
  };
  const [confirm, setConfirm] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? '일정 추가' : '일정 수정'}
      footer={
        <>
          {!isNew && (
            <Button variant="danger" className="mr-auto" onClick={() => setConfirm(true)}>
              삭제
            </Button>
          )}
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={save}>
            저장
          </Button>
        </>
      }
    >
      {confirm ? (
        <div className="space-y-3">
          <p className="text-sm">'{f.title}' 일정을 삭제할까요?</p>
          <div className="flex flex-wrap gap-2">
            {event.repeat !== 'none' && (
              <Button variant="danger" onClick={removeOne}>
                이 날({fmtShort(date)})만 삭제
              </Button>
            )}
            <Button variant="danger" onClick={removeAll}>
              {event.repeat !== 'none' ? '반복 일정 전체 삭제' : '삭제'}
            </Button>
            <Button onClick={() => setConfirm(false)}>취소</Button>
          </div>
        </div>
      ) : (
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field label="제목" error={err.title} className="sm:col-span-2">{(id) => <Input id={id} value={f.title} maxLength={80} onChange={(e) => set('title', e.target.value)} />}</Field>
          <Field label={f.repeat === 'none' ? '날짜' : '시작일'} error={err.date}>{(id) => <Input id={id} type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />}</Field>
          <Field label="시간 (선택)">{(id) => <Input id={id} type="time" value={f.time ?? ''} onChange={(e) => set('time', e.target.value || undefined)} />}</Field>
          <Field label="카테고리">
            {(id) => (
              <Select id={id} value={f.category} onChange={(e) => set('category', e.target.value as EventCategory)}>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="반복">
            {(id) => (
              <Select id={id} value={f.repeat} onChange={(e) => set('repeat', e.target.value as Repeat)}>
                {(Object.keys(REPEAT_LABEL) as Repeat[]).map((r) => (
                  <option key={r} value={r}>
                    {REPEAT_LABEL[r]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {f.repeat !== 'none' && (
            <Field label="반복 종료일 (선택)" error={err.repeatUntil} className="sm:col-span-2">
              {(id) => <Input id={id} type="date" value={f.repeatUntil ?? ''} onChange={(e) => set('repeatUntil', e.target.value || undefined)} />}
            </Field>
          )}
          <Field label="메모" className="sm:col-span-2">{(id) => <Textarea id={id} value={f.note} onChange={(e) => set('note', e.target.value)} />}</Field>
          {!isNew && f.repeat !== 'none' && <p className="text-xs text-muted sm:col-span-2">반복 일정을 수정하면 모든 날짜에 적용됩니다.</p>}
          <button type="submit" hidden />
        </form>
      )}
    </Modal>
  );
}
