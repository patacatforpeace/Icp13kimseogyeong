import { useState } from 'react';
import { Check as CheckIcon, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Card, Empty, Field, Input, Modal, PageHeader, Progress, Segmented, Select, Stat, Textarea, useConfirm, useToast } from '@/components/ui';
import { EnglishGrid } from '@/components/EnglishGrid';
import { canCheck, challengeInfo } from '@/lib/calc/english';
import { fmtDate, isValidISO } from '@/lib/date';
import { num, sum, uid } from '@/lib/format';
import { toggleAttendance } from '@/data/actions';
import type { Expression, StudyKind, StudyLog } from '@/data/types';

const KINDS: Record<StudyKind, string> = { grammar: '문법', speaking: '회화', expression: '표현', listening: '듣기', other: '기타' };

export default function English() {
  const { state, update, today } = useStore();
  const e = state.english;
  const info = challengeInfo(e, today);
  const toast = useToast();
  const [tab, setTab] = useState<'logs' | 'expr' | 'setup'>('logs');
  const can = canCheck(e, today, today);
  const checked = !!e.attendance[today];
  const totalMin = sum(e.logs.map((l) => l.minutes));

  return (
    <div>
      <PageHeader title="English" description={`${e.challengeName} · ${fmtDate(e.start)} – ${fmtDate(info.end)}`} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="출석" value={`${info.attended}/${e.days}일`}>
          <Progress value={info.ratio} label="챌린지 진행률" />
        </Stat>
        <Stat label="진행률" value={`${Math.round(info.ratio * 100)}%`} sub={info.started ? `${info.dayNo}일차` : '시작 전'} />
        <Stat label="연속 출석" value={`${info.streak}일`} sub="오늘 체크 전이면 어제까지 기준" />
        <Stat label="남은 일수" value={`${info.remainingDays}일`} sub={`100일째 ${fmtDate(info.end)}`} />
        <Stat label="총 학습 시간" value={`${num(Math.floor(totalMin / 60))}시간 ${totalMin % 60}분`} sub={`기록 ${e.logs.length}건 · 표현 ${e.expressions.length}개`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Card title="오늘 출석" subtitle={fmtDate(today)}>
          <button
            disabled={!can}
            onClick={() => {
              update((s) => toggleAttendance(s, today));
              toast(checked ? '오늘 출석을 취소했어요' : `${info.dayNo}일차 출석 완료`);
            }}
            aria-pressed={checked}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border py-8 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'border-ink bg-ink text-surface' : 'border-line hover:bg-subtle'}`}
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${checked ? 'border-surface' : 'border-line'}`}>{checked && <CheckIcon size={26} />}</span>
            <span className="text-base font-semibold">{checked ? `${info.dayNo}일차 출석 완료` : can ? `${info.dayNo}일차 출석하기` : '출석 기간이 아니에요'}</span>
            {checked && <span className="text-xs opacity-70">다시 누르면 취소</span>}
          </button>
          <p className="mt-3 text-xs text-muted">
            {!info.started
              ? `챌린지는 ${fmtDate(e.start)}에 시작해요. 출석은 해당 날짜 당일에만 체크할 수 있습니다.`
              : info.finished
                ? '챌린지 기간이 끝났어요. 기록은 그대로 보존됩니다.'
                : '출석은 실제 날짜 기준으로 오늘만 체크할 수 있어요. 지난 날짜나 미래 날짜는 체크할 수 없습니다.'}
          </p>
        </Card>
        <Card title="100일 출석 캘린더">
          <EnglishGrid e={e} today={today} />
        </Card>
      </div>

      <div className="mb-4 mt-6">
        <Segmented label="영어 탭" value={tab} onChange={setTab} options={[{ value: 'logs', label: '학습 기록' }, { value: 'expr', label: '배운 표현' }, { value: 'setup', label: '챌린지 설정' }]} />
      </div>
      {tab === 'logs' && <Logs />}
      {tab === 'expr' && <Expressions />}
      {tab === 'setup' && <Setup />}
    </div>
  );
}

function Logs() {
  const { state, update, today } = useStore();
  const [edit, setEdit] = useState<StudyLog | null>(null);
  const { ask, dialog } = useConfirm();
  const logs = [...state.english.logs].sort((a, b) => b.date.localeCompare(a.date));
  const byKind = (Object.keys(KINDS) as StudyKind[]).map((k) => ({ k, min: sum(state.english.logs.filter((l) => l.kind === k).map((l) => l.minutes)) }));
  return (
    <Card
      title="학습 기록"
      subtitle={byKind.filter((x) => x.min).map((x) => `${KINDS[x.k]} ${x.min}분`).join(' · ') || '문법, 회화, 표현 학습을 기록하세요'}
      action={
        <Button variant="primary" onClick={() => setEdit({ id: uid(), date: today, kind: 'grammar', minutes: 30, content: '' })}>
          <Plus size={15} /> 기록
        </Button>
      }
    >
      {logs.length === 0 ? (
        <Empty title="학습 기록이 없어요" />
      ) : (
        <ul className="divide-y divide-line">
          {logs.map((l) => (
            <li key={l.id} className="flex items-start gap-3 py-3">
              <div className="w-24 shrink-0">
                <p className="num text-sm">{fmtDate(l.date)}</p>
                <p className="text-xs text-muted">
                  {KINDS[l.kind]} · {l.minutes}분
                </p>
              </div>
              <p className="flex-1 whitespace-pre-wrap text-sm">{l.content || <span className="text-muted">내용 없음</span>}</p>
              <button className="btn-icon" aria-label="수정" onClick={() => setEdit(l)}>
                <Pencil size={15} />
              </button>
              <button className="btn-icon" aria-label="삭제" onClick={() => ask('학습 기록 삭제', '이 기록을 삭제할까요?', () => update((s) => void (s.english.logs = s.english.logs.filter((x) => x.id !== l.id))))}>
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {edit && <LogModal log={edit} onClose={() => setEdit(null)} />}
      {dialog}
    </Card>
  );
}

function LogModal({ log, onClose }: { log: StudyLog; onClose: () => void }) {
  const { update, today } = useStore();
  const [l, setL] = useState(log);
  const [err, setErr] = useState<Record<string, string>>({});
  const save = () => {
    const e: Record<string, string> = {};
    if (!isValidISO(l.date) || l.date > today) e.date = '오늘 또는 지난 날짜를 입력하세요';
    if (!(l.minutes > 0 && l.minutes <= 600)) e.minutes = '학습 시간(분)을 입력하세요';
    setErr(e);
    if (Object.keys(e).length) return;
    update((s) => {
      const i = s.english.logs.findIndex((x) => x.id === l.id);
      if (i >= 0) s.english.logs[i] = l;
      else s.english.logs.push(l);
    });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="학습 기록" footer={<><Button onClick={onClose}>취소</Button><Button variant="primary" onClick={save}>저장</Button></>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="날짜" error={err.date}>{(id) => <Input id={id} type="date" max={today} value={l.date} onChange={(e) => setL({ ...l, date: e.target.value })} />}</Field>
        <Field label="종류">
          {(id) => (
            <Select id={id} value={l.kind} onChange={(e) => setL({ ...l, kind: e.target.value as StudyKind })}>
              {Object.entries(KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="시간 (분)" error={err.minutes}>{(id) => <Input id={id} type="number" min={1} value={l.minutes || ''} onChange={(e) => setL({ ...l, minutes: Number(e.target.value) })} />}</Field>
        <Field label="학습 내용" className="sm:col-span-3">{(id) => <Textarea id={id} rows={4} value={l.content} placeholder="예: 현재완료 vs 과거 시제, 해커스톡 Day 12" onChange={(e) => setL({ ...l, content: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}

function Expressions() {
  const { state, update, today } = useStore();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Expression | null>(null);
  const { ask, dialog } = useConfirm();
  const list = [...state.english.expressions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((x) => !q || `${x.phrase} ${x.meaning} ${x.example}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card
      title="배운 표현"
      subtitle={`${state.english.expressions.length}개`}
      action={
        <Button variant="primary" onClick={() => setEdit({ id: uid(), date: today, phrase: '', meaning: '', example: '' })}>
          <Plus size={15} /> 표현 추가
        </Button>
      }
    >
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <Input aria-label="표현 검색" placeholder="표현 검색" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? (
        <Empty title={q ? '검색 결과가 없어요' : '아직 저장한 표현이 없어요'} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((x) => (
            <li key={x.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start gap-2">
                <p className="flex-1 font-semibold">{x.phrase}</p>
                <button className="btn-icon h-7 w-7" aria-label="수정" onClick={() => setEdit(x)}>
                  <Pencil size={14} />
                </button>
                <button className="btn-icon h-7 w-7" aria-label="삭제" onClick={() => ask('표현 삭제', `'${x.phrase}'를 삭제할까요?`, () => update((s) => void (s.english.expressions = s.english.expressions.filter((y) => y.id !== x.id))))}>
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm text-muted">{x.meaning}</p>
              {x.example && <p className="mt-2 text-sm italic">“{x.example}”</p>}
              <p className="num mt-2 text-[11px] text-muted">{fmtDate(x.date)}</p>
            </li>
          ))}
        </ul>
      )}
      {edit && <ExprModal expr={edit} onClose={() => setEdit(null)} />}
      {dialog}
    </Card>
  );
}

function ExprModal({ expr, onClose }: { expr: Expression; onClose: () => void }) {
  const { update } = useStore();
  const [x, setX] = useState(expr);
  const [err, setErr] = useState('');
  const save = () => {
    if (!x.phrase.trim()) return setErr('표현을 입력하세요');
    update((s) => {
      const i = s.english.expressions.findIndex((y) => y.id === x.id);
      if (i >= 0) s.english.expressions[i] = x;
      else s.english.expressions.push(x);
    });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="표현" footer={<><Button onClick={onClose}>취소</Button><Button variant="primary" onClick={save}>저장</Button></>}>
      <div className="grid gap-4">
        <Field label="표현" error={err}>{(id) => <Input id={id} value={x.phrase} placeholder="I'm swamped with work" onChange={(e) => setX({ ...x, phrase: e.target.value })} />}</Field>
        <Field label="뜻">{(id) => <Input id={id} value={x.meaning} onChange={(e) => setX({ ...x, meaning: e.target.value })} />}</Field>
        <Field label="예문">{(id) => <Textarea id={id} rows={2} value={x.example} onChange={(e) => setX({ ...x, example: e.target.value })} />}</Field>
        <Field label="날짜">{(id) => <Input id={id} type="date" value={x.date} onChange={(e) => setX({ ...x, date: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}

function Setup() {
  const { state, update } = useStore();
  const e = state.english;
  return (
    <Card title="챌린지 설정">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="챌린지 이름" className="sm:col-span-3">{(id) => <Input id={id} value={e.challengeName} onChange={(ev) => update((s) => void (s.english.challengeName = ev.target.value))} />}</Field>
        <Field label="시작일">{(id) => <Input id={id} type="date" value={e.start} onChange={(ev) => isValidISO(ev.target.value) && update((s) => void (s.english.start = ev.target.value))} />}</Field>
        <Field label="목표 일수">{(id) => <Input id={id} type="number" min={1} max={366} value={e.days} onChange={(ev) => { const n = Number(ev.target.value); if (n >= 1 && n <= 366) update((s) => void (s.english.days = n)); }} />}</Field>
        <Field label="환급 조건 메모" hint="확인된 조건만 적어 두세요. 앱은 조건을 추측하지 않습니다." className="sm:col-span-3">
          {(id) => <Textarea id={id} rows={4} value={e.refundNote} placeholder="예: 공식 안내 페이지에서 확인한 조건" onChange={(ev) => update((s) => void (s.english.refundNote = ev.target.value))} />}
        </Field>
      </div>
    </Card>
  );
}
