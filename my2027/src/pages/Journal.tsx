import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Card, Empty, Field, Input, Modal, PageHeader, Scale, Segmented, Stat, Textarea, useConfirm, useToast } from '@/components/ui';
import { SimpleLine, StackBars } from '@/components/charts';
import { MOODS, journalMonthly, summarize } from '@/lib/calc/journal';
import { addDaysISO, fmtDate, fmtMonth, isValidISO } from '@/lib/date';
import { num, uid } from '@/lib/format';
import type { ImpulseOutcome, JournalEntry } from '@/data/types';

const OUTCOME: Record<ImpulseOutcome, string> = { stopped: '멈췄다', partly: '일부 조절했다', acted: '행동으로 이어졌다' };

export default function Journal() {
  const { state, update, today } = useStore();
  const [edit, setEdit] = useState<JournalEntry | null>(null);
  const { ask, dialog } = useConfirm();
  const entries = [...state.journal].sort((a, b) => b.date.localeCompare(a.date));
  const todayEntry = state.journal.find((j) => j.date === today);
  const monthly = journalMonthly(state.journal);
  const last30 = summarize(state.journal.filter((j) => j.date > addDaysISO(today, -30)));
  const wins = entries.filter((j) => j.impulse && j.impulseOutcome && j.impulseOutcome !== 'acted');

  const blank = (date = today): JournalEntry => ({ id: uid(), date, mood: 3, intensity: 5, selfBlame: false, selfBlameNote: '', impulse: false, impulseNote: '', wins: '', gratitude: '', memo: '' });

  return (
    <div>
      <PageHeader
        title="Journal"
        description="감정과 행동을 있는 그대로 적는 공간입니다. 평가나 진단 없이, 패턴만 보여드려요."
        action={
          <Button variant="primary" onClick={() => setEdit(todayEntry ?? blank())}>
            {todayEntry ? <Pencil size={15} /> : <Plus size={15} />} {todayEntry ? '오늘 기록 수정' : '오늘 기록하기'}
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="최근 30일 기록" value={`${last30.count}일`} />
        <Stat label="평균 기분" value={last30.count ? `${num(last30.moodAvg, 1)} / 5` : '—'} sub="최근 30일" />
        <Stat label="자기비난을 알아차린 날" value={`${last30.selfBlame}일`} sub="최근 30일 · 알아차림도 기록입니다" />
        <Stat label="충동을 조절한 순간" value={`${last30.stopped + last30.partly}회`} sub={`충동 기록 ${last30.impulse}회 중`} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card title="월별 평균 기분" subtitle="1 많이 힘듦 – 5 아주 좋음">
          {monthly.length === 0 ? <Empty title="기록이 쌓이면 그래프가 그려져요" /> : <SimpleLine data={monthly.map((m) => ({ ...m, moodAvg: Math.round(m.moodAvg * 10) / 10 }))} xKey="month" yKey="moodAvg" name="평균 기분" xFmt={(v) => fmtMonth(String(v))} domain={[1, 5]} height={220} />}
        </Card>
        <Card title="월별 자기비난 · 충동 기록" subtitle="기록된 날 수">
          {monthly.length === 0 ? (
            <Empty title="기록이 쌓이면 그래프가 그려져요" />
          ) : (
            <StackBars
              data={monthly.map((m) => ({ month: m.month, selfBlame: m.selfBlame, controlled: m.stopped + m.partly, acted: m.impulse - m.stopped - m.partly }))}
              xKey="month"
              xFmt={(v) => `${Number(String(v).slice(5))}월`}
              height={220}
              series={[
                { key: 'selfBlame', name: '자기비난', color: 'accent' },
                { key: 'controlled', name: '충동 조절', color: 'ink' },
                { key: 'acted', name: '충동 행동', color: 'soft' },
              ]}
              valueFmt={(v) => `${v}일`}
            />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="기록">
          {entries.length === 0 ? (
            <Empty title="아직 기록이 없어요" action={<Button onClick={() => setEdit(blank())}>오늘 기록하기</Button>} />
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((j) => (
                <li key={j.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="num font-semibold">{fmtDate(j.date)}</p>
                    <span className="chip">기분 {MOODS[j.mood - 1]?.label}</span>
                    <span className="chip num">강도 {j.intensity}/10</span>
                    {j.selfBlame && <span className="chip">자기비난 알아차림</span>}
                    {j.impulse && <span className="chip">충동 · {j.impulseOutcome ? OUTCOME[j.impulseOutcome] : '기록'}</span>}
                    <span className="ml-auto flex">
                      <button className="btn-icon" aria-label={`${fmtDate(j.date)} 기록 수정`} onClick={() => setEdit(j)}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn-icon" aria-label={`${fmtDate(j.date)} 기록 삭제`} onClick={() => ask('기록 삭제', `${fmtDate(j.date)} 기록을 삭제할까요?`, () => update((s) => void (s.journal = s.journal.filter((x) => x.id !== j.id))))}>
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </div>
                  <dl className="mt-2 grid gap-1 text-sm">
                    {j.wins && <Row k="잘한 일" v={j.wins} />}
                    {j.gratitude && <Row k="감사" v={j.gratitude} />}
                    {j.selfBlameNote && <Row k="자기비난" v={j.selfBlameNote} />}
                    {j.impulseNote && <Row k="충동" v={j.impulseNote} />}
                    {j.memo && <Row k="메모" v={j.memo} />}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="충동 조절 성공 사례" subtitle="멈췄거나 일부 조절한 순간">
          {wins.length === 0 ? (
            <Empty title="아직 없어요">충동을 느꼈을 때 멈추거나 줄인 순간을 기록하면 여기에 모입니다.</Empty>
          ) : (
            <ul className="space-y-3">
              {wins.map((j) => (
                <li key={j.id} className="rounded-xl border border-line p-3">
                  <p className="num text-xs text-muted">
                    {fmtDate(j.date)} · {OUTCOME[j.impulseOutcome!]}
                  </p>
                  <p className="mt-1 text-sm">{j.impulseNote || '메모 없음'}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {edit && <EntryModal entry={edit} onClose={() => setEdit(null)} />}
      {dialog}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
    <dt className="text-xs text-muted">{k}</dt>
    <dd className="whitespace-pre-wrap">{v}</dd>
  </div>
);

function EntryModal({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const { state, update, today } = useStore();
  const toast = useToast();
  const [j, setJ] = useState(entry);
  const [err, setErr] = useState('');
  const set = (p: Partial<JournalEntry>) => setJ({ ...j, ...p });
  const clash = state.journal.find((x) => x.date === j.date && x.id !== j.id);

  const save = () => {
    if (!isValidISO(j.date) || j.date > today) return setErr('오늘 또는 지난 날짜를 입력하세요');
    if (clash) return setErr('이 날짜에는 이미 기록이 있어요. 해당 기록을 수정하세요.');
    update((s) => {
      const i = s.journal.findIndex((x) => x.id === j.id);
      const clean = { ...j, impulseOutcome: j.impulse ? j.impulseOutcome : undefined };
      if (i >= 0) s.journal[i] = clean;
      else s.journal.push(clean);
    });
    toast('기록을 저장했어요');
    onClose();
  };

  return (
    <Modal open wide onClose={onClose} title={`${fmtDate(j.date)} 기록`} footer={<><Button onClick={onClose}>취소</Button><Button variant="primary" onClick={save}>저장</Button></>}>
      <div className="grid gap-5">
        <Field label="날짜" error={err}>{(id) => <Input id={id} type="date" max={today} value={j.date} onChange={(e) => set({ date: e.target.value })} />}</Field>
        <Field label="오늘의 기분">{() => <Scale label="오늘의 기분" min={1} max={5} value={j.mood} onChange={(v) => set({ mood: v })} labels={MOODS.map((m) => m.label)} />}</Field>
        <Field label="감정 강도 (1 잔잔함 – 10 매우 강함)">{() => <Scale label="감정 강도" min={1} max={10} value={j.intensity} onChange={(v) => set({ intensity: v })} />}</Field>

        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-1 text-xs font-medium text-muted">자기비난</legend>
          <Segmented label="자기비난 여부" value={j.selfBlame ? 'y' : 'n'} onChange={(v) => set({ selfBlame: v === 'y' })} options={[{ value: 'n', label: '없었다' }, { value: 'y', label: '있었다' }]} />
          {j.selfBlame && <Textarea className="mt-3" aria-label="자기비난 메모" rows={2} placeholder="어떤 말을 스스로에게 했나요? 친구에게라면 뭐라고 말해줄까요?" value={j.selfBlameNote} onChange={(e) => set({ selfBlameNote: e.target.value })} />}
        </fieldset>

        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-1 text-xs font-medium text-muted">충동</legend>
          <Segmented label="충동 여부" value={j.impulse ? 'y' : 'n'} onChange={(v) => set({ impulse: v === 'y', impulseOutcome: v === 'y' ? j.impulseOutcome ?? 'stopped' : undefined })} options={[{ value: 'n', label: '없었다' }, { value: 'y', label: '있었다' }]} />
          {j.impulse && (
            <div className="mt-3 grid gap-3">
              <Segmented label="충동 조절 결과" value={j.impulseOutcome ?? 'stopped'} onChange={(v) => set({ impulseOutcome: v })} options={(Object.keys(OUTCOME) as ImpulseOutcome[]).map((k) => ({ value: k, label: OUTCOME[k] }))} />
              <Textarea aria-label="충동 메모" rows={2} placeholder="무엇이 충동을 불렀고, 어떻게 했나요?" value={j.impulseNote} onChange={(e) => set({ impulseNote: e.target.value })} />
            </div>
          )}
        </fieldset>

        <Field label="오늘 잘한 일">{(id) => <Textarea id={id} rows={2} value={j.wins} onChange={(e) => set({ wins: e.target.value })} />}</Field>
        <Field label="오늘의 감사">{(id) => <Textarea id={id} rows={2} value={j.gratitude} onChange={(e) => set({ gratitude: e.target.value })} />}</Field>
        <Field label="자유 메모">{(id) => <Textarea id={id} rows={3} value={j.memo} onChange={(e) => set({ memo: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}
