import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Card, Empty, Field, Input, Modal, PageHeader, Progress, Scale, Segmented, Select, Stat, Textarea, useConfirm, useToast } from '@/components/ui';
import { StackBars, WeightChart } from '@/components/charts';
import { monthlyAverages, sortedWeights, weeklyAverages, weightSeries, weightSummary, workoutMonth, workoutWeek, workoutWeeks } from '@/lib/calc/health';
import { fmtDate, fmtMonth, fmtShort, isValidISO, monthOf, weekStartISO } from '@/lib/date';
import { kg, num, uid } from '@/lib/format';
import type { StrengthSet, Workout, WorkoutType } from '@/data/types';

const TYPES: { key: WorkoutType; label: string; ko: string }[] = [
  { key: 'strength', label: 'Strength Training', ko: '근력운동' },
  { key: 'running', label: 'Running', ko: '러닝' },
  { key: 'yoga', label: 'Yoga', ko: '요가' },
  { key: 'walking', label: 'Walking', ko: '걷기' },
  { key: 'other', label: 'Other', ko: '기타' },
];
const typeKo = (t: WorkoutType) => TYPES.find((x) => x.key === t)?.ko ?? t;

export default function Health() {
  const [tab, setTab] = useState<'weight' | 'workout'>('weight');
  return (
    <div>
      <PageHeader title="Health & Fitness" description="체중과 운동 기록. 숫자는 변화의 방향을 보기 위한 것입니다." action={<Segmented label="건강 탭" value={tab} onChange={setTab} options={[{ value: 'weight', label: '체중' }, { value: 'workout', label: '운동' }]} />} />
      {tab === 'weight' ? <WeightTab /> : <WorkoutTab />}
    </div>
  );
}

// ── Weight ──────────────────────────────────────────────────────────────
function WeightTab() {
  const { state, update, today } = useStore();
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const [date, setDate] = useState(today);
  const [val, setVal] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const s = weightSummary(state.weights, state.health);
  const weekly = weeklyAverages(state.weights);
  const monthly = monthlyAverages(state.weights);
  const thisWeek = weekly.find((w) => w.week === weekStartISO(today));
  const thisMonth = monthly.find((m) => m.month === monthOf(today));
  const series = weightSeries(state.weights);
  const existing = state.weights.find((w) => w.date === date);

  const submit = () => {
    const n = Number(val);
    if (!isValidISO(date)) return setErr('날짜를 확인하세요');
    if (date > today) return setErr('미래 날짜는 기록할 수 없어요');
    if (!val || Number.isNaN(n) || n < 25 || n > 250) return setErr('체중을 kg 단위로 입력하세요 (예: 55.8)');
    setErr('');
    update((st) => {
      const e = st.weights.find((w) => w.date === date);
      if (e) {
        e.kg = Math.round(n * 10) / 10;
        if (note) e.note = note;
      } else st.weights.push({ id: uid(), date, kg: Math.round(n * 10) / 10, note });
    });
    toast(existing ? `${fmtDate(date)} 체중을 수정했어요` : '체중을 기록했어요');
    setVal('');
    setNote('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="최근 체중" value={kg(s.current)} sub={s.latest ? fmtDate(s.latest.date) : '기록 없음'} />
        <Stat label="목표 체중" value={kg(state.health.targetWeight)} sub={`시작 ${kg(state.health.startWeight)}`} />
        <Stat label="목표까지" value={s.remaining > 0 ? `${num(s.remaining, 1)}kg` : '도달'} sub={`시작 대비 ${s.lost >= 0 ? '-' : '+'}${num(Math.abs(s.lost), 1)}kg`}>
          <Progress value={s.ratio} label="체중 목표 진행률" />
        </Stat>
        <Stat label="이번 주 평균" value={thisWeek ? kg(thisWeek.avg) : '—'} sub={thisWeek ? `${thisWeek.n}회 기록` : '이번 주 기록 없음'} />
        <Stat label="이번 달 평균" value={thisMonth ? kg(thisMonth.avg) : '—'} sub={thisMonth ? `${thisMonth.n}회 기록` : '이번 달 기록 없음'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="체중 변화" subtitle="점은 일별 기록, 굵은 선은 7일 평균">
          {series.length < 2 ? <Empty title="기록이 2개 이상이면 그래프가 그려져요" /> : <WeightChart data={series} target={state.health.targetWeight} height={280} />}
        </Card>
        <Card title="체중 기록">
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="날짜">{(id) => <Input id={id} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
              <Field label="체중 (kg)" error={err}>{(id) => <Input id={id} inputMode="decimal" placeholder={existing ? String(existing.kg) : '56.5'} value={val} onChange={(e) => setVal(e.target.value)} />}</Field>
            </div>
            <Field label="메모 (선택)">{(id) => <Input id={id} value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} />}</Field>
            <Button type="submit" variant="primary">
              {existing ? '이 날짜 기록 수정' : '기록하기'}
            </Button>
            {existing && <p className="text-xs text-muted">이 날짜에 이미 {kg(existing.kg)}이 기록돼 있어요. 저장하면 덮어씁니다.</p>}
          </form>
        </Card>
      </div>

      <Card title="기록 목록" action={<Segmented label="기록 보기" value={view} onChange={setView} options={[{ value: 'daily', label: '일별' }, { value: 'weekly', label: '주간 평균' }, { value: 'monthly', label: '월간 평균' }]} />} bodyClass="overflow-x-auto">
        {state.weights.length === 0 ? (
          <Empty title="아직 체중 기록이 없어요" />
        ) : view === 'daily' ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>날짜</th>
                <th className="text-right">체중</th>
                <th className="text-right">전 기록 대비</th>
                <th>메모</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedWeights(state.weights)
                .reverse()
                .slice(0, 60)
                .map((w, i, arr) => {
                  const prev = arr[i + 1];
                  const d = prev ? w.kg - prev.kg : 0;
                  return (
                    <tr key={w.id}>
                      <td className="num">{fmtDate(w.date)}</td>
                      <td className="num text-right font-medium">{kg(w.kg)}</td>
                      <td className="num text-right text-muted">{prev ? `${d > 0 ? '+' : ''}${num(d, 1)}` : '—'}</td>
                      <td className="text-muted">{w.note}</td>
                      <td className="whitespace-nowrap text-right">
                        <button
                          className="btn-icon"
                          aria-label={`${fmtDate(w.date)} 기록 수정`}
                          onClick={() => {
                            setDate(w.date);
                            setVal(String(w.kg));
                            setNote(w.note);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button className="btn-icon" aria-label={`${fmtDate(w.date)} 기록 삭제`} onClick={() => ask('체중 기록 삭제', `${fmtDate(w.date)} 기록(${kg(w.kg)})을 삭제할까요?`, () => update((s) => void (s.weights = s.weights.filter((x) => x.id !== w.id))))}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>{view === 'weekly' ? '주 (월요일 시작)' : '월'}</th>
                <th className="text-right">평균</th>
                <th className="text-right">기록 수</th>
              </tr>
            </thead>
            <tbody>
              {(view === 'weekly' ? weekly.map((w) => ({ k: fmtDate(w.week), avg: w.avg, n: w.n })) : monthly.map((m) => ({ k: fmtMonth(m.month), avg: m.avg, n: m.n })))
                .reverse()
                .map((r) => (
                  <tr key={r.k}>
                    <td className="num">{r.k}</td>
                    <td className="num text-right font-medium">{kg(r.avg)}</td>
                    <td className="num text-right text-muted">{r.n}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Card>
      {dialog}
    </div>
  );
}

// ── Workout ─────────────────────────────────────────────────────────────
function WorkoutTab() {
  const { state, update, today } = useStore();
  const { ask, dialog } = useConfirm();
  const [edit, setEdit] = useState<Workout | null>(null);
  const wk = workoutWeek(state.workouts, today);
  const mo = workoutMonth(state.workouts, monthOf(today));
  const weeks = workoutWeeks(state.workouts, today, 12);
  const list = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));
  const h = state.health;

  const blank = (): Workout => ({ id: uid(), date: today, type: 'strength', minutes: 60, exercises: [], intensity: 3, condition: 3, memo: '' });

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setEdit(blank())}>
          <Plus size={16} /> 운동 기록
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="이번 주 운동" value={`${wk.count}회`} sub={`${num(wk.minutes)}분`} />
        <Stat label="근력운동" value={`${wk.strength}/${h.strengthPerWeek}회`} sub="이번 주 목표 대비">
          <Progress value={wk.strength / h.strengthPerWeek} label="근력운동 주간 목표" />
        </Stat>
        <Stat label="유산소" value={`${wk.cardio}/${h.cardioPerWeek}회`} sub="러닝·걷기">
          <Progress value={wk.cardio / h.cardioPerWeek} label="유산소 주간 목표" />
        </Stat>
        <Stat label="주간 러닝 거리" value={`${num(wk.runKm, 1)}km`} sub="이번 주" />
        <Stat label="월간 운동 시간" value={`${num(mo.minutes)}분`} sub={`이번 달 ${mo.count}회 · 러닝 ${num(mo.runKm, 1)}km`} />
      </div>

      <Card title="주간 운동 기록" subtitle="최근 12주, 종류별 횟수">
        <StackBars
          data={weeks}
          xKey="week"
          xFmt={fmtShort}
          height={240}
          series={[
            { key: 'strength', name: '근력', color: 'ink' },
            { key: 'cardio', name: '유산소', color: 'accent' },
            { key: 'other', name: '요가·기타', color: 'soft' },
          ]}
          valueFmt={(v) => `${v}회`}
        />
      </Card>

      <Card title="운동 기록" bodyClass="overflow-x-auto">
        {list.length === 0 ? (
          <Empty title="아직 운동 기록이 없어요" action={<Button onClick={() => setEdit(blank())}>첫 기록 남기기</Button>} />
        ) : (
          <table className="tbl min-w-[640px]">
            <thead>
              <tr>
                <th>날짜</th>
                <th>종류</th>
                <th className="text-right">시간</th>
                <th>내용</th>
                <th className="text-right">강도</th>
                <th className="text-right">컨디션</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id}>
                  <td className="num">{fmtDate(w.date)}</td>
                  <td>{typeKo(w.type)}</td>
                  <td className="num text-right">{w.minutes}분</td>
                  <td className="text-muted">
                    {w.type === 'running' || w.type === 'walking' ? (
                      <span className="num">
                        {num(w.distanceKm ?? 0, 2)}km{w.distanceKm ? ` · ${pace(w.minutes, w.distanceKm)}/km` : ''}
                      </span>
                    ) : w.exercises.length ? (
                      <span className="line-clamp-1">{w.exercises.map((e) => `${e.name} ${e.weightKg}kg×${e.reps}×${e.sets}`).join(', ')}</span>
                    ) : (
                      w.memo
                    )}
                  </td>
                  <td className="num text-right">{w.intensity}/5</td>
                  <td className="num text-right">{w.condition}/5</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-icon" aria-label="운동 기록 수정" onClick={() => setEdit(w)}>
                      <Pencil size={15} />
                    </button>
                    <button className="btn-icon" aria-label="운동 기록 삭제" onClick={() => ask('운동 기록 삭제', `${fmtDate(w.date)} ${typeKo(w.type)} 기록을 삭제할까요?`, () => update((s) => void (s.workouts = s.workouts.filter((x) => x.id !== w.id))))}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {edit && <WorkoutModal workout={edit} onClose={() => setEdit(null)} />}
      {dialog}
    </div>
  );
}

function pace(min: number, km: number) {
  const p = min / km;
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function WorkoutModal({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const { state, update, today } = useStore();
  const toast = useToast();
  const [f, setF] = useState<Workout>(workout);
  const [err, setErr] = useState<Record<string, string>>({});
  const isNew = !state.workouts.some((w) => w.id === workout.id);
  const cardio = f.type === 'running' || f.type === 'walking';

  const setEx = (id: string, patch: Partial<StrengthSet>) => setF({ ...f, exercises: f.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const save = () => {
    const e: Record<string, string> = {};
    if (!isValidISO(f.date) || f.date > today) e.date = '오늘 또는 지난 날짜를 입력하세요';
    if (!(f.minutes > 0 && f.minutes <= 600)) e.minutes = '운동 시간(분)을 입력하세요';
    if (cardio && f.distanceKm !== undefined && (f.distanceKm < 0 || f.distanceKm > 100)) e.distance = '거리를 확인하세요';
    setErr(e);
    if (Object.keys(e).length) return;
    const clean: Workout = {
      ...f,
      distanceKm: cardio ? f.distanceKm : undefined,
      exercises: f.type === 'strength' ? f.exercises.filter((x) => x.name.trim()) : [],
    };
    update((s) => {
      const i = s.workouts.findIndex((x) => x.id === clean.id);
      if (i >= 0) s.workouts[i] = clean;
      else s.workouts.push(clean);
    });
    toast('운동을 기록했어요');
    onClose();
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={isNew ? '운동 기록' : '운동 기록 수정'}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={save}>
            저장
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="날짜" error={err.date}>{(id) => <Input id={id} type="date" max={today} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />}</Field>
        <Field label="운동 종류">
          {(id) => (
            <Select id={id} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as WorkoutType })}>
              {TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.ko} ({t.label})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="운동 시간 (분)" error={err.minutes}>{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={600} value={f.minutes || ''} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} />}</Field>

        {cardio && (
          <Field label="거리 (km)" error={err.distance} hint={f.distanceKm && f.minutes ? `페이스 ${pace(f.minutes, f.distanceKm)}/km` : undefined}>
            {(id) => <Input id={id} type="number" inputMode="decimal" step="0.01" min={0} value={f.distanceKm ?? ''} onChange={(e) => setF({ ...f, distanceKm: e.target.value === '' ? undefined : Number(e.target.value) })} />}
          </Field>
        )}

        {f.type === 'strength' && (
          <div className="sm:col-span-3">
            <p className="label">운동 종목 · 세트 · 반복 · 중량</p>
            <div className="space-y-2">
              {f.exercises.map((x) => (
                <div key={x.id} className="grid grid-cols-[minmax(0,1fr)_64px_64px_72px_36px] items-center gap-2">
                  <Input aria-label="종목" placeholder="힙 쓰러스트" value={x.name} onChange={(e) => setEx(x.id, { name: e.target.value })} />
                  <Input aria-label="세트" type="number" min={0} value={x.sets || ''} placeholder="세트" onChange={(e) => setEx(x.id, { sets: Number(e.target.value) })} />
                  <Input aria-label="반복 횟수" type="number" min={0} value={x.reps || ''} placeholder="회" onChange={(e) => setEx(x.id, { reps: Number(e.target.value) })} />
                  <Input aria-label="중량 kg" type="number" min={0} step="0.5" value={x.weightKg || ''} placeholder="kg" onChange={(e) => setEx(x.id, { weightKg: Number(e.target.value) })} />
                  <button className="btn-icon" aria-label="종목 삭제" onClick={() => setF({ ...f, exercises: f.exercises.filter((y) => y.id !== x.id) })}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <Button className="mt-2" onClick={() => setF({ ...f, exercises: [...f.exercises, { id: uid(), name: '', sets: 3, reps: 12, weightKg: 0 }] })}>
              <Plus size={15} /> 종목 추가
            </Button>
          </div>
        )}

        <Field label="운동 강도 (1 가벼움 – 5 매우 힘듦)" className="sm:col-span-3">{() => <Scale label="운동 강도" min={1} max={5} value={f.intensity} onChange={(v) => setF({ ...f, intensity: v })} />}</Field>
        <Field label="컨디션 (1 나쁨 – 5 좋음)" className="sm:col-span-3">{() => <Scale label="컨디션" min={1} max={5} value={f.condition} onChange={(v) => setF({ ...f, condition: v })} />}</Field>
        <Field label="메모" className="sm:col-span-3">{(id) => <Textarea id={id} value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}
