import { useState } from 'react';
import { useStore } from '@/data/store';
import { PageHeader, Segmented } from '@/components/ui';
import Overview from './finance/Overview';
import Ledger from './finance/Ledger';
import Debts from './finance/Debts';
import Savings from './finance/Savings';
import Plan from './finance/Plan';

type Tab = 'overview' | 'ledger' | 'debts' | 'savings' | 'plan';

export default function Finance() {
  const [tab, setTab] = useState<Tab>('overview');
  useStore();
  return (
    <div>
      <PageHeader title="Finance" description="모든 금액은 원(KRW). 입력한 기록만으로 계산하며, 확정되지 않은 수입은 더하지 않습니다." />
      <div className="mb-5 overflow-x-auto">
        <Segmented
          label="재정 탭"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: '개요' },
            { value: 'ledger', label: '수입·지출' },
            { value: 'debts', label: '부채' },
            { value: 'savings', label: '저축' },
            { value: 'plan', label: '계획·시뮬레이션' },
          ]}
        />
      </div>
      {tab === 'overview' && <Overview go={setTab} />}
      {tab === 'ledger' && <Ledger />}
      {tab === 'debts' && <Debts />}
      {tab === 'savings' && <Savings />}
      {tab === 'plan' && <Plan />}
    </div>
  );
}
