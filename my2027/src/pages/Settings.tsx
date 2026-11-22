import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Download, Plus, Trash2, Upload } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Card, Field, Input, Modal, Notice, PageHeader, Segmented, Select, Textarea, useToast } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import { EVENT_CATEGORIES } from '@/data/seed';
import { exportEnvelope, normalizeState } from '@/data/normalize';
import { fmtDate, isValidISO, weekdayKo, addDaysISO } from '@/lib/date';
import { uid } from '@/lib/format';
import type { AppState, EventCategory, ThemePref } from '@/data/types';
import { getDay, parseISO } from 'date-fns';

type ClaudeRuntime = { use(name: string): Promise<unknown> };

async function saveFile(filename: string, text: string): Promise<'saved' | 'declined' | 'unavailable'> {
  const rt = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (rt && typeof rt.use === 'function') {
    const dl = (await Promise.race([rt.use('downloads'), new Promise((r) => setTimeout(() => r(null), 4000))])) as { save(o: { filename: string; data: string | Blob }): Promise<unknown> } | null;
    if (dl) {
      try {
        await dl.save({ filename, data: new Blob([text], { type: 'application/json' }) });
        return 'saved';
      } catch {
        return 'declined';
      }
    }
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'saved';
  } catch {
    return 'unavailable';
  }
}

export default function SettingsPage() {
  const { state, update, today } = useStore();
  const p = state.profile;
  const h = state.health;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="프로필, 기본값, 주간 패턴, 데이터 백업을 관리합니다." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="프로필">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="이름 (인사말에 표시)">{(id) => <Input id={id} value={p.name} maxLength={20} onChange={(e) => update((s) => void (s.profile.name = e.target.value))} />}</Field>
            <Field label="계약 종료일">{(id) => <Input id={id} type="date" value={p.contractEnd} onChange={(e) => isValidISO(e.target.value) && update((s) => void (s.profile.contractEnd = e.target.value))} />}</Field>
            <Field label="오늘의 핵심 목표" className="sm:col-span-2">{(id) => <Input id={id} value={p.todayFocus} maxLength={80} onChange={(e) => update((s) => void (s.profile.todayFocus = e.target.value))} />}</Field>
            <Field label="BETA TEST 시작일">{(id) => <Input id={id} type="date" value={p.betaStart} onChange={(e) => isValidISO(e.target.value) && e.target.value < p.executionStart && update((s) => void (s.profile.betaStart = e.target.value))} />}</Field>
            <Field label="EXECUTION 시작일" hint="이 날부터 자동으로 EXECUTION 모드로 바뀝니다">{(id) => <Input id={id} type="date" value={p.executionStart} onChange={(e) => isValidISO(e.target.value) && e.target.value > p.betaStart && update((s) => void (s.profile.executionStart = e.target.value))} />}</Field>
          </div>
        </Card>

        <Card title="화면">
          <Field label="테마">
            {() => (
              <Segmented<ThemePref>
                label="테마"
                value={state.settings.theme}
                onChange={(v) => update((s) => void (s.settings.theme = v))}
                options={[
                  { value: 'system', label: '시스템' },
                  { value: 'light', label: '라이트' },
                  { value: 'dark', label: '다크' },
                ]}
              />
            )}
          </Field>
          <div className="mt-6 grid gap-2 text-sm">
            <p className="text-xs font-medium text-muted">다른 곳에서 수정하는 항목</p>
            <Link className="hover:underline" to="/goals">연간 목표 수정 → Goals</Link>
            <Link className="hover:underline" to="/habits">습관 추가·수정·쉬기 → Habits</Link>
            <Link className="hover:underline" to="/finance">부채 항목·생활비 예산·시뮬레이션 → Finance</Link>
            <Link className="hover:underline" to="/english">영어 챌린지 기간·환급 메모 → English</Link>
          </div>
        </Card>

        <Card title="건강 기본값">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="시작 체중 (kg)">{(id) => <NumberField id={id} value={h.startWeight} min={25} max={250} step={0.1} onCommit={(v) => update((s) => void (s.health.startWeight = v))} />}</Field>
            <Field label="목표 체중 (kg)">{(id) => <NumberField id={id} value={h.targetWeight} min={25} max={250} step={0.1} onCommit={(v) => update((s) => void (s.health.targetWeight = v))} />}</Field>
            <Field label="근력운동 주간 목표">{(id) => <NumberField id={id} value={h.strengthPerWeek} min={1} max={7} step={1} onCommit={(v) => update((s) => void (s.health.strengthPerWeek = v))} />}</Field>
            <Field label="유산소 주간 목표">{(id) => <NumberField id={id} value={h.cardioPerWeek} min={1} max={7} step={1} onCommit={(v) => update((s) => void (s.health.cardioPerWeek = v))} />}</Field>
          </div>
        </Card>

        <Card title="재정 초기값" subtitle="세부 항목은 Finance › 계획에서 수정">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="월 실수령 수입">{(id) => <MoneyInput id={id} value={state.finance.plan.monthlyNetIncome} onChange={(v) => update((s) => void (s.finance.plan.monthlyNetIncome = v ?? 0))} />}</Field>
            <Field label="가족 부채 월 상환 목표">{(id) => <MoneyInput id={id} value={state.finance.plan.familyMonthlyTarget} onChange={(v) => update((s) => void (s.finance.plan.familyMonthlyTarget = v ?? 0))} />}</Field>
            <Field label="기록 시작 시 보유 현금">{(id) => <MoneyInput id={id} value={state.finance.plan.openingCash} onChange={(v) => update((s) => void (s.finance.plan.openingCash = v ?? 0))} />}</Field>
            <Field label="계약 종료 후 월 수입 (확정분만)">{(id) => <MoneyInput id={id} value={state.finance.plan.postContractIncome} onChange={(v) => update((s) => void (s.finance.plan.postContractIncome = v ?? 0))} />}</Field>
          </div>
        </Card>
      </div>

      <RoutineEditor />
      <DataCard />
      <p className="num text-center text-xs text-muted">MY 2027 · 오늘 {fmtDate(today)} (Asia/Seoul)</p>
    </div>
  );
}

function NumberField({ id, value, min, max, step, onCommit }: { id: string; value: number; min: number; max: number; step: number; onCommit: (v: number) => void }) {
  const [t, setT] = useState(String(value));
  const n = Number(t);
  const bad = t === '' || Number.isNaN(n) || n < min || n > max;
  return (
    <>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={t} onChange={(e) => { setT(e.target.value); const v = Number(e.target.value); if (e.target.value !== '' && v >= min && v <= max) onCommit(v); }} />
      {bad && <p className="mt-1 text-xs text-danger">{min}–{max} 사이로 입력하세요</p>}
    </>
  );
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
/** First date on/after the beta start that falls on the given weekday. */
function firstWeekday(start: string, wd: number) {
  let d = start;
  while (getDay(parseISO(d)) !== wd) d = addDaysISO(d, 1);
  return d;
}

function RoutineEditor() {
  const { state, update, today } = useStore();
  const routine = state.events.filter((e) => e.routine);
  const toast = useToast();
  return (
    <Card title="기본 주간 패턴" subtitle="매주 반복되는 루틴 · 수정하면 캘린더의 모든 주에 적용됩니다">
      <ul className="divide-y divide-line">
        {DAY_ORDER.map((wd) => {
          const items = routine.filter((e) => getDay(parseISO(e.date)) === wd);
          return (
            <li key={wd} className="grid gap-2 py-3 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-start">
              <p className="pt-2 text-sm font-semibold">{['일', '월', '화', '수', '목', '금', '토'][wd]}요일</p>
              <div className="space-y-2">
                {items.map((e) => (
                  <div key={e.id} className="grid grid-cols-[minmax(0,1fr)_120px_36px] gap-2">
                    <Input aria-label={`${weekdayKo(e.date)}요일 루틴`} value={e.title} maxLength={60} onChange={(ev) => update((s) => void (s.events.find((x) => x.id === e.id)!.title = ev.target.value))} />
                    <Select aria-label="카테고리" value={e.category} onChange={(ev) => update((s) => void (s.events.find((x) => x.id === e.id)!.category = ev.target.value as EventCategory))}>
                      {EVENT_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                    <button
                      className="btn-icon"
                      aria-label="루틴 삭제"
                      onClick={() => {
                        // End the series yesterday so past occurrences and completions stay in the record.
                        update((s) => {
                          const x = s.events.find((y) => y.id === e.id)!;
                          if (x.date >= today) s.events = s.events.filter((y) => y.id !== e.id);
                          else x.repeatUntil = addDaysISO(today, -1);
                          if (x.date < today) x.routine = false;
                        });
                        toast('루틴을 종료했어요. 지난 기록은 남아 있습니다.');
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-ghost min-h-[32px] px-2 text-xs"
                  onClick={() =>
                    update((s) =>
                      void s.events.push({
                        id: uid(),
                        title: '새 루틴',
                        date: firstWeekday(today > s.profile.betaStart ? today : s.profile.betaStart, wd),
                        category: 'personal',
                        repeat: 'weekly',
                        note: '기본 주간 패턴',
                        completed: [],
                        skipped: [],
                        routine: true,
                      }),
                    )
                  }
                >
                  <Plus size={14} /> 추가
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function DataCard() {
  const { state, replaceAll, resetAll, sync } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<AppState | null>(null);
  const [importErr, setImportErr] = useState('');
  const [paste, setPaste] = useState('');
  const [reset, setReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const json = () => JSON.stringify(exportEnvelope(state), null, 2);
  const filename = `my2027-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const parse = (text: string) => {
    try {
      setPreview(normalizeState(JSON.parse(text)));
      setImportErr('');
    } catch (e) {
      setPreview(null);
      setImportErr(e instanceof SyntaxError ? 'JSON 형식이 올바르지 않습니다.' : (e as Error).message);
    }
  };

  return (
    <Card title="데이터 백업 · 복원" subtitle="1년 동안 쓰는 기록이니 한 달에 한 번은 백업해 두세요">
      <div className="mb-4 rounded-xl bg-subtle px-4 py-3 text-sm">
        <p>
          저장 위치: <strong>이 브라우저</strong>
          {sync.cloud === 'synced' || sync.cloud === 'saving' ? <> + <strong>{sync.cloudName}</strong> (다른 기기에서도 같은 계정으로 열면 이어집니다)</> : null}
        </p>
        {sync.cloud === 'off' && <p className="mt-1 text-xs text-muted">브라우저 데이터를 지우거나 다른 기기를 쓰면 기록이 보이지 않을 수 있어요. JSON 백업을 내보내 두세요.</p>}
        {sync.error && <p className="mt-1 text-xs text-danger">{sync.error}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <h3 className="text-sm font-semibold">내보내기</h3>
          <p className="mt-1 text-xs text-muted">모든 기록을 JSON 파일 하나로 저장합니다.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={async () => {
                const r = await saveFile(filename, json());
                toast(r === 'saved' ? '백업 파일을 저장했어요' : r === 'declined' ? '저장이 취소됐어요' : '파일 저장을 쓸 수 없어요. JSON 복사를 이용하세요');
              }}
            >
              <Download size={15} /> JSON 내보내기
            </Button>
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(json());
                  toast('JSON을 클립보드에 복사했어요');
                } catch {
                  toast('복사할 수 없어요');
                }
              }}
            >
              <Copy size={15} /> JSON 복사
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">가져오기</h3>
          <p className="mt-1 text-xs text-muted">백업 파일을 선택하거나 JSON을 붙여넣으세요. 현재 데이터를 덮어씁니다.</p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) parse(await file.text());
              e.target.value = '';
            }}
          />
          <Button className="mt-3" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> 파일 선택
          </Button>
          <Textarea className="mt-3" rows={3} aria-label="JSON 붙여넣기" placeholder="또는 JSON 붙여넣기" value={paste} onChange={(e) => setPaste(e.target.value)} />
          <Button className="mt-2" disabled={!paste.trim()} onClick={() => parse(paste)}>
            붙여넣은 JSON 확인
          </Button>
          {importErr && <p className="mt-2 text-xs text-danger">{importErr}</p>}
        </div>

        <div>
          <h3 className="text-sm font-semibold">전체 초기화</h3>
          <p className="mt-1 text-xs text-muted">모든 기록을 지우고 처음 상태로 되돌립니다. 되돌릴 수 없으니 먼저 백업하세요.</p>
          <Button variant="danger" className="mt-3" onClick={() => setReset(true)}>
            <Trash2 size={15} /> 전체 데이터 초기화
          </Button>
        </div>
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="백업 복원"
        footer={
          <>
            <Button onClick={() => setPreview(null)}>취소</Button>
            <Button
              variant="primary"
              onClick={() => {
                replaceAll(preview!);
                setPreview(null);
                setPaste('');
                toast('백업을 복원했어요');
              }}
            >
              덮어쓰고 복원
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-2 text-sm">
            <Notice level="warning">현재 데이터가 백업 내용으로 바뀝니다.</Notice>
            <ul className="num grid grid-cols-2 gap-1 text-muted">
              <li>목표 {preview.goals.length}개</li>
              <li>일정 {preview.events.length}개</li>
              <li>습관 {preview.habits.length}개</li>
              <li>체중 기록 {preview.weights.length}건</li>
              <li>운동 기록 {preview.workouts.length}건</li>
              <li>상환 기록 {preview.finance.payments.length}건</li>
              <li>영어 출석 {Object.keys(preview.english.attendance).length}일</li>
              <li>감정 기록 {preview.journal.length}건</li>
            </ul>
          </div>
        )}
      </Modal>

      <Modal
        open={reset}
        onClose={() => {
          setReset(false);
          setConfirmText('');
        }}
        title="전체 데이터 초기화"
        footer={
          <>
            <Button onClick={() => setReset(false)}>취소</Button>
            <Button
              variant="danger"
              disabled={confirmText !== '초기화'}
              onClick={async () => {
                await resetAll();
                setReset(false);
                setConfirmText('');
                toast('모든 데이터를 초기화했어요');
              }}
            >
              영구 삭제
            </Button>
          </>
        }
      >
        <p className="text-sm">체중, 운동, 재정, 영어, 기록, 회고 등 모든 데이터가 삭제됩니다. 계속하려면 아래에 <strong>초기화</strong>라고 입력하세요.</p>
        <Input className="mt-3" aria-label="확인 문구" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="초기화" />
      </Modal>
    </Card>
  );
}
