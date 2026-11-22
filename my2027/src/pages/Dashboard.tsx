import { Link } from 'react-router-dom';
import { ArrowRight, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/data/store';
import { Badge, Card, Check, Empty, Input, Progress, Stat, cx } from '@/components/ui';
import { DebtChart, RateBars, WeightChart } from '@/components/charts';
import { EnglishGrid } from '@/components/EnglishGrid';
import { appMode } from '@/lib/calc/mode';
import { weightSeries, weightSummary } from '@/lib/calc/health';
import { debtHistory, debtTotals, flowMonths } from '@/lib/calc/finance';
import { challengeInfo } from '@/lib/calc/english';
import { isDone, weekRate, weeklyHistory } from '@/lib/calc/habits';
import { overallGoalProgress } from '@/lib/calc/goals';
import { occurrencesInRange } from '@/lib/calc/calendar';
import { addDaysISO, diffDays, fmtDate, fmtDateLong, fmtShort, monthOf, quarterOf, seoulHour, weekStartISO, weekdayKo } from '@/lib/date';
import { kg, num, pct, won } from '@/lib/format';
import { toggleHabit, toggleOccurrence } from '@/data/actions';
import { MOODS } from '@/lib/calc/journal';
import { EVENT_CATEGORIES, GOAL_AREAS } from '@/data/seed';

function greeting(name: string) {
  const h = seoulHour();
  const who = name ? `${name}님, ` : '';
  if (h < 5) return `${who}늦은 밤이에요. 오늘은 여기까지도 충분해요.`;
  if (h < 12) return `${who}좋은 아침이에요.`;
  if (h < 18) return `${who}오후도 천천히, 꾸준히.`;
  return `${who}오늘 하루도 수고했어요.`;
}

export default function Dashboard() {
  const { state, update, today } = useStore();
  const mode = appMode(today, state.profile);
  const [editFocus, setEditFocus] = useState(false);

  const w = weightSummary(state.weights, state.health);
  const debt = debtTotals(state.finance);
  const eng = challengeInfo(state.english, today);
  const habitsWeek = weekRate(state.habits, state.habitLogs, today);
  const goals = overallGoalProgress(state.goals);
  const dLeft = diffDays(state.profile.contractEnd, today);

  const todayOcc = occurrencesInRange(state.events, today, today);
  const ws = weekStartISO(today);
  const weekOcc = occurrencesInRange(state.events, ws, addDaysISO(ws, 6));
  const activeHabits = state.habits.filter((h) => h.active);

  const habitHist = weeklyHistory(state.habits, state.habitLogs, today, 8).map((x) => ({ ...x, pct: Math.round(x.ratio * 100) }));
  const wSeries = weightSeries(state.weights).slice(-60);
  const months = flowMonths(state.finance, '2026-11', monthOf(today) < '2026-11' ? '2026-11' : monthOf(today));
  const dHist = debtHistory(state.finance, months);
  const recentJournal = [...state.journal].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const q = quarterOf(today < '2027-01-01' ? '2027-01-01' : today);
  const quarterGoals = state.goals.flatMap((g) => g.items.filter((i) => i.quarter === q).map((i) => ({ g, i }))).sort((a, b) => Number(a.i.done) - Number(b.i.done));

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="num">{fmtDateLong(today)}</span>
            <Badge tone={mode.mode === 'execution' ? 'ink' : 'warning'}>{mode.label}</Badge>
            <span className="text-xs">{mode.detail}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[30px]">{greeting(state.profile.name)}</h1>
        </div>
        <div className="card w-full max-w-md px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">오늘의 핵심 목표</p>
            <button className="btn-icon h-7 w-7" onClick={() => setEditFocus((v) => !v)} aria-label="오늘의 핵심 목표 수정">
              <Pencil size={14} />
            </button>
          </div>
          {editFocus ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEditFocus(false);
              }}
            >
              <Input autoFocus aria-label="오늘의 핵심 목표" value={state.profile.todayFocus} maxLength={80} onChange={(e) => update((s) => void (s.profile.todayFocus = e.target.value))} onBlur={() => setEditFocus(false)} />
            </form>
          ) : (
            <p className="mt-0.5 text-[15px] font-semibold">{state.profile.todayFocus || '아직 정하지 않았어요'}</p>
          )}
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6" aria-label="핵심 지표">
        <Link to="/health" className="contents">
          <Stat label="Health · 체중" value={kg(w.current)} sub={`목표 ${kg(state.health.targetWeight)} · ${w.remaining > 0 ? `${num(w.remaining, 1)}kg 남음` : '목표 도달'}`}>
            <Progress value={w.ratio} label="체중 목표 진행률" />
          </Stat>
        </Link>
        <Link to="/finance" className="contents">
          <Stat label="Finance · 남은 부채" value={won(debt.total)} sub={`상환 ${pct(debt.ratio)} · ${won(debt.repaid)}`}>
            <Progress value={debt.ratio} label="부채 상환 진행률" />
          </Stat>
        </Link>
        <Link to="/english" className="contents">
          <Stat label="English · 100일 챌린지" value={`${eng.attended}/${state.english.days}일`} sub={eng.started ? (eng.finished ? '챌린지 기간 종료' : `${eng.dayNo}일차 · 연속 ${eng.streak}일`) : `${fmtDate(state.english.start)} 시작`}>
            <Progress value={eng.ratio} label="영어 챌린지 진행률" />
          </Stat>
        </Link>
        <Link to="/habits" className="contents">
          <Stat label="Habits · 이번 주" value={pct(habitsWeek.ratio)} sub={`${habitsWeek.done} / ${habitsWeek.target}회`}>
            <Progress value={habitsWeek.ratio} label="이번 주 습관 달성률" />
          </Stat>
        </Link>
        <Link to="/goals" className="contents">
          <Stat label="Career · 계약 종료" value={dLeft > 0 ? `D-${dLeft}` : dLeft === 0 ? 'D-DAY' : `D+${-dLeft}`} sub={fmtDate(state.profile.contractEnd)} />
        </Link>
        <Link to="/goals" className="contents">
          <Stat label="Goals · 연간 목표" value={pct(goals.ratio)} sub={`세부 항목 ${goals.done}/${goals.total} 완료`}>
            <Progress value={goals.ratio} label="연간 목표 달성률" />
          </Stat>
        </Link>
      </section>

      {/* Today + week */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="오늘의 할 일" subtitle="일정과 습관을 바로 체크할 수 있어요" action={<Link className="btn btn-ghost min-h-0 py-1 text-xs" to="/calendar">일정 <ArrowRight size={14} /></Link>}>
          {todayOcc.length === 0 && activeHabits.length === 0 ? (
            <Empty title="오늘 등록된 일정이 없어요" />
          ) : (
            <ul className="divide-y divide-line">
              {todayOcc.map((o) => (
                <li key={o.event.id} className="flex items-center gap-3 py-2.5">
                  <Check checked={o.done} onChange={() => update((s) => toggleOccurrence(s, o.event.id, today))} label={`${o.event.title} 완료`} />
                  <span className={cx('flex-1 text-sm', o.done && 'text-muted line-through')}>{o.event.title}</span>
                  {o.event.time && <span className="num text-xs text-muted">{o.event.time}</span>}
                  <span className="chip">{EVENT_CATEGORIES.find((c) => c.key === o.event.category)?.label}</span>
                </li>
              ))}
              {activeHabits.map((h) => {
                const done = isDone(state.habitLogs, h.id, today);
                return (
                  <li key={h.id} className="flex items-center gap-3 py-2.5">
                    <Check checked={done} onChange={() => update((s) => toggleHabit(s, h.id, today))} label={`${h.name} 완료`} />
                    <span className={cx('flex-1 text-sm', done && 'text-muted line-through')}>{h.name}</span>
                    <span className="chip">습관</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="이번 주 일정" subtitle={`${fmtDate(ws)} – ${fmtShort(addDaysISO(ws, 6))}`}>
          <ol className="space-y-1">
            {Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i)).map((d) => {
              const occ = weekOcc.filter((o) => o.date === d);
              return (
                <li key={d} className={cx('flex gap-3 rounded-lg px-2 py-1.5', d === today && 'bg-subtle')}>
                  <span className={cx('num w-14 shrink-0 text-xs', d === today ? 'font-semibold' : 'text-muted')}>
                    {weekdayKo(d)} {fmtShort(d)}
                  </span>
                  <span className="flex-1 text-sm">
                    {occ.length === 0 ? <span className="text-muted">—</span> : occ.map((o) => <span key={o.event.id} className={cx('mr-2 inline-block', o.done && 'text-muted line-through')}>{o.event.title}</span>)}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="주간 습관 달성률" subtitle="최근 8주, 습관별 주간 목표 대비">
          <RateBars data={habitHist} xKey="weekStart" xFmt={fmtShort} height={200} />
        </Card>
        <Card title="최근 체중 변화" subtitle={`시작 ${kg(state.health.startWeight)} → 목표 ${kg(state.health.targetWeight)}`}>
          {wSeries.length < 2 ? (
            <Empty title="체중 기록이 2개 이상이면 그래프가 그려져요" action={<Link className="btn btn-secondary" to="/health">체중 기록하기</Link>} />
          ) : (
            <WeightChart data={wSeries} target={state.health.targetWeight} height={200} />
          )}
        </Card>
        <Card title="부채 잔액 변화" subtitle="월말 기준, 기록한 상환액 반영">
          {state.finance.payments.length === 0 ? (
            <div>
              <p className="num text-2xl font-semibold">{won(debt.total)}</p>
              <p className="mt-1 text-xs text-muted">아직 상환 기록이 없어요. 재정 페이지에서 상환을 기록하면 변화가 그려집니다.</p>
            </div>
          ) : (
            <DebtChart data={dHist} height={200} />
          )}
        </Card>
        <Card title="영어 출석 현황" subtitle={`${state.english.challengeName} · ${eng.attended}/${state.english.days}일`} action={<Link className="btn btn-ghost min-h-0 py-1 text-xs" to="/english">출석하기 <ArrowRight size={14} /></Link>}>
          <EnglishGrid e={state.english} today={today} compact />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="최근 기록" action={<Link className="btn btn-ghost min-h-0 py-1 text-xs" to="/journal">Journal <ArrowRight size={14} /></Link>}>
          {recentJournal.length === 0 ? (
            <Empty title="아직 기록이 없어요" action={<Link className="btn btn-secondary" to="/journal">오늘 기록하기</Link>} />
          ) : (
            <ul className="divide-y divide-line">
              {recentJournal.map((j) => (
                <li key={j.id} className="py-2.5">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="num">{fmtDate(j.date)}</span>
                    <span>· 기분 {MOODS[j.mood - 1]?.label}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm">{j.wins || j.gratitude || j.memo || '메모 없음'}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`${q}분기 주요 목표`} subtitle="분기별 세부 항목" action={<Link className="btn btn-ghost min-h-0 py-1 text-xs" to="/goals">Goals <ArrowRight size={14} /></Link>}>
          {quarterGoals.length === 0 ? (
            <Empty title="이번 분기에 배정된 항목이 없어요" />
          ) : (
            <ul className="divide-y divide-line">
              {quarterGoals.slice(0, 7).map(({ g, i }) => (
                <li key={i.id} className="flex items-center gap-3 py-2">
                  <Check
                    checked={i.done}
                    label={`${i.text} 완료`}
                    onChange={(v) =>
                      update((s) => {
                        const it = s.goals.find((x) => x.id === g.id)?.items.find((x) => x.id === i.id);
                        if (it) {
                          it.done = v;
                          it.doneAt = v ? today : undefined;
                        }
                      })
                    }
                  />
                  <span className={cx('flex-1 text-sm', i.done && 'text-muted line-through')}>{i.text}</span>
                  <span className="chip">{GOAL_AREAS.find((a) => a.area === g.area)?.short}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
