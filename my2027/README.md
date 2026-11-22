# MY 2027 — Personal Life Management Dashboard

> Build a life you can sustain.

2027년 연간 목표·습관·운동·재정·영어·감정 기록을 한곳에서 관리하는 개인용 웹앱.
2026년 12월은 BETA TEST, 2027년 1월 1일부터 자동으로 EXECUTION 모드.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm test         # 계산 로직 테스트 (vitest)
npm run build    # dist/ 에 정적 파일 생성 (Vercel/Netlify/GitHub Pages 어디든 배포 가능)
```

`?today=2027-01-15` 쿼리로 다른 날짜를 가정해 화면을 확인할 수 있습니다.

## 구조

- `src/data/types.ts` — 도메인 모델 (날짜는 YYYY-MM-DD, 금액은 원 단위 정수)
- `src/data/seed.ts` — 초기 목표·습관·주간 루틴·재정 값
- `src/data/storage/` — 저장소 어댑터. `localAdapter`(브라우저), `artifactDbAdapter`(claude.ai 아티팩트 클라우드)
  - Supabase 등으로 옮길 때는 `StorageAdapter` 인터페이스를 구현해 `repository.ts`에 연결하면 됩니다.
- `src/data/repository.ts` — 로컬 즉시 저장 + 클라우드 지연 저장, 최신 데이터 선택
- `src/lib/calc/` — UI와 분리된 계산 로직 (습관 달성률, 체중 평균, 부채·시뮬레이션, 영어 챌린지, 회고)
- `src/pages/` — 10개 메뉴 페이지

## 재정 계산 원칙

- 부채 현재 잔액 = 기록 시작 시점 잔액 − 기록한 상환액 (항목끼리 중복 계산 없음)
- 여동생 보증금 3,840,000원은 반환해야 할 채무로만 계산 (수입·자산 아님)
- 확정되지 않은 프리랜서 수입·실업급여는 시뮬레이션에 넣지 않음 (계약 종료 후 수입 기본 0원)
