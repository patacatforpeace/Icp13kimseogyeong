import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/data/store';
import { Card, Field, PageHeader, Progress, Segmented, Textarea, cx } from '@/components/ui';
import { RateBars, SimpleLine } from '@/components/charts';
import { periodMetrics, weeklyNotes, type PeriodMetrics } from '@/lib/calc/review';
import { periodRate } from '@/lib/calc/habits';
import { QUARTER_THEMES, GOAL_AREAS } from '@/data/seed';
import { addDaysISO, addMonthsYM, fmtDate, fmtMonth, fmtShort, monthEndISO, monthOf, monthsBetween, quarterOf, quarterRange, weekStartISO } from '@/lib/date';
import { kg, num, pct, uid, won } from '@/lib/format';
import { debtTotals } from '@/lib/calc/finance';
import { journalMonthly } from '@/lib/calc/journal';
import { sortedWeights } from '@/lib/calc/health';
import type { AppState } from '@/data/types';

type Tab = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export default function Review() {
  const [tab, setTab] = useState<Tab>('weekly');
  return (
    <div>
      <PageHeader title="Review" description="기록을 모아 돌아봅니다. 숫자는 자동으로, 생각은 직접 적어요." />
      <div className="mb-5">
        <Segmented label="회고 탭" value={tab} onChange={setTab} options={[{ value: 'weekly', label: '주간' }, { value: 'monthly', label: '월간' }, { value: 'quarterly', label: '분기' }, { value: 'annual', label: '연간 리포트' }]} />
      </div>
      {tab === 'weekly' && <Weekly />}
      {tab === 'monthly' && <Monthly />}
      {tab === 'quarterly' && <Quarterly />}
      {tab === 'annual' && <Annual />}
    </div>
  );
}

function Pager({ label, onPrev, onNext, nextDisabled }: { label: string; onPrev: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-1">
      <button className="btn-icon" onClick={onPrev} aria-label="이전">
        <ChevronLeft size={18} />
      </button>
      <h2 className="num text-lg font-semibold">{label}</h2>
      <button className="btn-icon" onClick={onNext} aria-label="다음" disabled={nextDisabled}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function MetricGrid({ m }: { m: PeriodMetrics }) {
  const items: [string, ReactNode, string?][] = [
    ['습관 달성률', pct(m.habits.ratio)],
    ['운동', `${m.workouts.count}회`, `근력 ${m.workouts.strength} · 유산소 ${m.workouts.cardio} · ${m.workouts.minutes}분`],
    ['체중 변화', m.weight.change === undefined ? '—' : `${m.weight.change > 0 ? '+' : ''}${num(m.weight.change, 1)}kg`, m.weight.end ? `마지막 ${kg(m.weight.end)}` : '기록 없음'],
    ['영어 출석', m.english.days ? `${m.english.attended}/${m.english.days}일` : '—', `학습 ${m.english.minutes}분`],
    ['수입 / 지출', won(m.money.income), `지출 ${won(m.money.expense)}`],
    ['부채 상환', won(m.money.debtPaid), `기간 말 잔액 ${won(m.money.debtEnd)}`],
    ['감정 기록', `${m.journal.count}일`, m.journal.count ? `평균 기분 ${num(m.journal.moodAvg, 1)}/5` : undefined],
    ['충동 조절', `${m.journal.stopped + m.journal.partly}/${m.journal.impulse}`, `자기비난 알아차림 ${m.journal.selfBlame}일`],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([k, v, sub]) => (
        <div key={k} className="card p-4">
          <p className="text-xs text-muted">{k}</p>
          <p className="num mt-1 text-xl font-semibold">{v}</p>
          {sub && <p className="num mt-0.5 text-xs text-muted">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Weekly ──────────────────────────────────────────────────────────────
const WEEK_Q: { key: 'kept' | 'brokeWhy' | 'best' | 'improve' | 'nextFocus'; q: string }[] = [
  { key: 'kept', q: '이번 주에 잘 지킨 약속은?' },
  { key: 'brokeWhy', q: '계획이 무너진 이유는?' },
  { key: 'best', q: '가장 만족스러웠던 일은?' },
  { key: 'improve', q: '다음 주에 개선할 점은?' },
  { key: 'nextFocus', q: '다음 주의 가장 중요한 목표는?' },
];

function Weekly() {
  const { state, update, today } = useStore();
  const [ws, setWs] = useState(weekStartISO(today));
  const we = addDaysISO(ws, 6);
  const m = periodMetrics(state, ws, we, today);
  const notes = weeklyNotes(m);
  const r = state.reviews.weekly.find((x) => x.weekStart === ws);
  const set = (key: (typeof WEEK_Q)[number]['key'], v: string) =>
    update((s) => {
      let x = s.reviews.weekly.find((y) => y.weekStart === ws);
      if (!x) {
        x = { id: uid(), weekStart: ws, kept: '', brokeWhy: '', best: '', improve: '', nextFocus: '' };
        s.reviews.weekly.push(x);
      }
      x[key] = v;
    });
  const past = [...state.reviews.weekly].filter((x) => x.weekStart !== ws && WEEK_Q.some((q) => x[q.key])).sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  return (
    <div className="space-y-5">
      <Pager label={`${fmtDate(ws)} – ${fmtShort(we)} 주`} onPrev={() => setWs(addDaysISO(ws, -7))} onNext={() => setWs(addDaysISO(ws, 7))} nextDisabled={addDaysISO(ws, 7) > today} />
      <MetricGrid m={m} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="자동 주간 요약" subtitle="이번 주 기록에서 모았어요">
          <h3 className="text-xs font-semibold text-muted">해낸 것</h3>
          {notes.good.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {notes.good.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">이번 주 기록이 아직 없어요.</p>
          )}
          <h3 className="mt-4 text-xs font-semibold text-muted">다음 주에 해볼 만한 것</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {notes.next.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h3 className="mt-4 text-xs font-semibold text-muted">습관별</h3>
          <ul className="mt-2 space-y-2">
            {m.habitRows.map((h) => (
              <li key={h.name} className="grid grid-cols-[96px_minmax(0,1fr)_40px] items-center gap-2 text-sm">
                <span className="truncate">{h.name}</span>
                <Progress value={h.ratio} tone="accent" label={`${h.name} 주간 달성률`} />
                <span className="num text-right text-xs text-muted">{h.done}회</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="주간 리뷰" subtitle="매주 일요일, 5가지 질문 · 입력하는 대로 저장됩니다">
          <div className="space-y-4">
            {WEEK_Q.map((q) => (
              <Field key={q.key} label={q.q}>
                {(id) => <Textarea id={id} rows={2} value={r?.[q.key] ?? ''} onChange={(e) => set(q.key, e.target.value)} />}
              </Field>
            ))}
          </div>
        </Card>
      </div>
      {past.length > 0 && (
        <Card title="지난 주간 리뷰">
          <ul className="divide-y divide-line">
            {past.slice(0, 12).map((p) => (
              <li key={p.id} className="py-3">
                <button className="num text-sm font-semibold hover:underline" onClick={() => setWs(p.weekStart)}>
                  {fmtDate(p.weekStart)} 주
                </button>
                {p.nextFocus && <p className="mt-0.5 text-sm text-muted">다음 주 목표: {p.nextFocus}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ── Monthly ─────────────────────────────────────────────────────────────
function Monthly() {
  const { state, update, today } = useStore();
  const [month, setMonth] = useState(monthOf(today));
  const from = `${month}-01`;
  const to = monthEndISO(month);
  const m = periodMetrics(state, from, to, today);
  const prev = periodMetrics(state, `${addMonthsYM(month, -1)}-01`, monthEndISO(addMonthsYM(month, -1)), today);
  const r = state.reviews.monthly.find((x) => x.month === month);
  const set = (key: 'achievements' | 'improvements' | 'note', v: string) =>
    update((s) => {
      let x = s.reviews.monthly.find((y) => y.month === month);
      if (!x) {
        x = { id: uid(), month, achievements: '', improvements: '', note: '' };
        s.reviews.monthly.push(x);
      }
      x[key] = v;
    });
  const q = quarterOf(month < '2027-01' ? '2027-01-01' : from);
  const qItems = state.goals.flatMap((g) => g.items.filter((i) => i.quarter === q));
  const qDone = qItems.filter((i) => i.done).length;
  const debtChange = prev.money.debtEnd - m.money.debtEnd;

  return (
    <div className="space-y-5">
      <Pager label={fmtMonth(month)} onPrev={() => setMonth(addMonthsYM(month, -1))} onNext={() => setMonth(addMonthsYM(month, 1))} nextDisabled={addMonthsYM(month, 1) > monthOf(today)} />
      <MetricGrid m={m} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="이 달의 숫자">
          <dl className="divide-y divide-line text-sm">
            <Line k={`${q}분기 목표 항목 달성`} v={`${qDone}/${qItems.length} (${pct(qItems.length ? qDone / qItems.length : 0)})`} />
            <Line k="이 달에 완료한 목표 항목" v={`${m.goalItemsDone.length}개`} />
            <Line k="평균 체중 (지난달 대비)" v={m.weight.avg ? `${kg(m.weight.avg)}${prev.weight.avg ? ` (${m.weight.avg - prev.weight.avg > 0 ? '+' : ''}${num(m.weight.avg - prev.weight.avg, 1)})` : ''}` : '—'} />
            <Line k="운동 횟수 (지난달)" v={`${m.workouts.count}회 (${prev.workouts.count}회)`} />
            <Line k="영어 출석률" v={m.english.days ? pct(m.english.ratio) : '챌린지 기간 아님'} />
            <Line k="수입 − 지출" v={won(m.money.income - m.money.expense)} />
            <Line k="부채 감소" v={won(debtChange)} />
            <Line k="저축" v={won(m.money.saved)} />
            <Line k="감정 기록 / 평균 기분" v={`${m.journal.count}일 / ${m.journal.count ? num(m.journal.moodAvg, 1) : '—'}`} />
          </dl>
          {m.goalItemsDone.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm">
              {m.goalItemsDone.map((g) => (
                <li key={g.text}>{g.text}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="월간 회고">
          <div className="space-y-4">
            <Field label="주요 성과">{(id) => <Textarea id={id} rows={3} value={r?.achievements ?? ''} onChange={(e) => set('achievements', e.target.value)} />}</Field>
            <Field label="다음 달 개선 사항">{(id) => <Textarea id={id} rows={3} value={r?.improvements ?? ''} onChange={(e) => set('improvements', e.target.value)} />}</Field>
            <Field label="메모">{(id) => <Textarea id={id} rows={2} value={r?.note ?? ''} onChange={(e) => set('note', e.target.value)} />}</Field>
          </div>
        </Card>
      </div>
    </div>
  );
}

const Line = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="flex justify-between gap-3 py-2">
    <dt className="text-muted">{k}</dt>
    <dd className="num text-right font-medium">{v}</dd>
  </div>
);

// ── Quarterly ───────────────────────────────────────────────────────────
function Quarterly() {
  const { state, update, today } = useStore();
  const [q, setQ] = useState(today >= '2027-01-01' && today <= '2027-12-31' ? quarterOf(today) : 1);
  const [from, to] = quarterRange(2027, q);
  const m = periodMetrics(state, from, to, today);
  const r = state.reviews.quarterly.find((x) => x.quarter === q);
  const set = (key: 'summary' | 'nextActions', v: string) =>
    update((s) => {
      let x = s.reviews.quarterly.find((y) => y.quarter === q);
      if (!x) {
        x = { id: uid(), quarter: q, summary: '', nextActions: '' };
        s.reviews.quarterly.push(x);
      }
      x[key] = v;
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="분기" value={String(q)} onChange={(v) => setQ(Number(v))} options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n}분기` }))} />
        <p className="text-sm text-muted">
          {QUARTER_THEMES[q - 1]} · <span className="num">{fmtDate(from)} – {fmtDate(to)}</span>
        </p>
      </div>
      <MetricGrid m={m} />
      <Card title="목표 대비 실제 성과" subtitle="계획과 성과는 Goals 페이지와 같은 내용이며 여기서 바로 수정할 수 있어요" bodyClass="overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead>
            <tr>
              <th className="w-48">목표</th>
              <th className="w-28">항목 달성</th>
              <th>분기 계획</th>
              <th>실제 성과</th>
            </tr>
          </thead>
          <tbody>
            {state.goals.map((g) => {
              const items = g.items.filter((i) => i.quarter === q);
              const done = items.filter((i) => i.done).length;
              return (
                <tr key={g.id}>
                  <td>
                    <p className="text-[11px] text-muted">{GOAL_AREAS.find((a) => a.area === g.area)?.no}</p>
                    <p className="font-medium">{g.title}</p>
                  </td>
                  <td>
                    <p className="num text-sm">
                      {done}/{items.length}
                    </p>
                    <Progress value={items.length ? done / items.length : 0} tone="accent" label={`${g.title} 분기 달성률`} />
                  </td>
                  <td>
                    <Textarea aria-label={`${g.title} ${q}분기 계획`} rows={2} value={g.quarters[q - 1].plan} onChange={(e) => update((s) => void (s.goals.find((x) => x.id === g.id)!.quarters[q - 1].plan = e.target.value))} />
                  </td>
                  <td>
                    <Textarea aria-label={`${g.title} ${q}분기 실제 성과`} rows={2} value={g.quarters[q - 1].result} onChange={(e) => update((s) => void (s.goals.find((x) => x.id === g.id)!.quarters[q - 1].result = e.target.value))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card title="분기 회고">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="이번 분기 돌아보기">{(id) => <Textarea id={id} rows={4} value={r?.summary ?? ''} onChange={(e) => set('summary', e.target.value)} />}</Field>
          <Field label="다음 분기에 가져갈 것">{(id) => <Textarea id={id} rows={4} value={r?.nextActions ?? ''} onChange={(e) => set('nextActions', e.target.value)} />}</Field>
        </div>
      </Card>
    </div>
  );
}

// ── Annual growth report ────────────────────────────────────────────────
function Annual() {
  const { state, today } = useStore();
  const start = state.profile.betaStart;
  const end = '2027-12-31';
  const beta = periodMetrics(state, start, addDaysISO(state.profile.executionStart, -1), today);
  const year = periodMetrics(state, state.profile.executionStart, end, today);
  const months = monthsBetween(monthOf(start), monthOf(today) < monthOf(end) ? monthOf(today) : monthOf(end));
  const habitByMonth = months.map((mm) => ({ month: mm, pct: Math.round(periodRate(state.habits, state.habitLogs, `${mm}-01`, monthEndISO(mm), today).ratio * 100) }));
  const mood = journalMonthly(state.journal).map((x) => ({ month: x.month, mood: Math.round(x.moodAvg * 10) / 10 }));
  const ws = sortedWeights(state.weights);
  const debtNow = debtTotals(state.finance).total;
  const debtStart = debtTotals(state.finance).opening;

  return (
    <div className="space-y-5">
      <Card title="2026.12 – 2027.12 성장 리포트" subtitle="베타 기간부터 오늘까지 기록 기준">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Big k="체중" from={kg(state.health.startWeight)} to={ws.length ? kg(ws.at(-1)!.kg) : '—'} />
          <Big k="전체 부채" from={won(debtStart)} to={won(debtNow)} />
          <Big k="운동" from="0회" to={`${state.workouts.length}회`} />
          <Big k="영어 출석" from="0일" to={`${Object.keys(state.english.attendance).length}일`} />
          <Big k="감정 기록" from="0일" to={`${state.journal.length}일`} />
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="월별 습관 달성률">
          <RateBars data={habitByMonth} xKey="month" xFmt={(v) => `${Number(String(v).slice(5))}월`} height={220} />
        </Card>
        <Card title="월별 평균 기분">{mood.length ? <SimpleLine data={mood} xKey="month" yKey="mood" name="평균 기분" xFmt={(v) => fmtMonth(String(v))} domain={[1, 5]} height={220} /> : <p className="text-sm text-muted">Journal 기록이 쌓이면 표시됩니다.</p>}</Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PeriodCard title="BETA TEST (2026.12)" subtitle="2027 계획을 시험한 기간 — 계획을 조정할 때 참고하세요" m={beta} state={state} />
        <PeriodCard title="EXECUTION (2027)" subtitle="정식 실행 기간" m={year} state={state} />
      </div>
    </div>
  );
}

function Big({ k, from, to }: { k: string; from: string; to: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{k}</p>
      <p className="num mt-1 text-xl font-semibold">{to}</p>
      <p className="num text-xs text-muted">시작 {from}</p>
    </div>
  );
}

function PeriodCard({ title, subtitle, m }: { title: string; subtitle: string; m: PeriodMetrics; state: AppState }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <dl className="divide-y divide-line text-sm">
        <Line k="습관 달성률" v={pct(m.habits.ratio)} />
        <Line k="운동 (근력 / 유산소)" v={`${m.workouts.count}회 (${m.workouts.strength} / ${m.workouts.cardio})`} />
        <Line k="러닝 거리" v={`${num(m.workouts.runKm, 1)}km`} />
        <Line k="체중 변화" v={m.weight.change === undefined ? '—' : `${m.weight.change > 0 ? '+' : ''}${num(m.weight.change, 1)}kg`} />
        <Line k="영어 출석" v={m.english.days ? `${m.english.attended}/${m.english.days}일` : '—'} />
        <Line k="수입 / 지출" v={`${won(m.money.income)} / ${won(m.money.expense)}`} />
        <Line k="부채 상환" v={won(m.money.debtPaid)} />
        <Line k="감정 기록" v={`${m.journal.count}일`} />
        <Line k="일정 완료" v={`${m.events.done}/${m.events.total}`} />
      </dl>
      <p className={cx('mt-2 text-xs text-muted')}>기록은 삭제되지 않고 보존됩니다.</p>
    </Card>
  );
}
