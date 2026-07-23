# CYPHERS.STATS — 사이퍼즈 전적 검색

넥슨 **사이퍼즈**의 OP.GG 스타일 전적 검색 웹앱입니다. Neople 오픈API를 기반으로
플레이어 전적, 랭킹, 캐릭터, 아이템 정보를 제공합니다.

- **프레임워크**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **데이터**: [Neople 오픈API](https://developers.neople.co.kr/contents/apiDocs/cyphers)
- **핵심 원칙**: API 키는 **서버에서만** 사용 → 브라우저로 절대 노출되지 않음

---

## 빠른 시작

### 1. API 키 발급

1. https://developers.neople.co.kr 로그인
2. **애플리케이션 등록** → 사이퍼즈 API 키 발급

### 2. 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 발급받은 키를 넣으세요:

```bash
cp .env.example .env.local
```

```env
# .env.local
NEOPLE_API_KEY=여기에_발급받은_키_붙여넣기
```

> `.env.local` 은 `.gitignore` 에 포함되어 있어 커밋되지 않습니다.
> `NEOPLE_API_KEY` 는 `NEXT_PUBLIC_` 접두사가 없으므로 클라이언트 번들에 포함되지 않습니다.

### 3. 설치 및 실행

```bash
npm install
npm run dev       # 개발 서버 → http://localhost:3000
```

프로덕션 빌드:

```bash
npm run build
npm run start
```

---

## 주요 기능 (Phase 1)

| 기능 | 경로 | 설명 |
|------|------|------|
| 플레이어 검색 | `/search?nickname=` | 닉네임으로 플레이어 검색 (동명이인 목록) |
| 전적/프로필 | `/players/[playerId]` | 티어·평점·통산 전적·최근 매치 리스트 (공식전/일반전 필터) |
| 매치 상세 | `/matches/[matchId]` | 팀별 플레이어·캐릭터·KDA·사용 아이템·포인트 |
| 평점 랭킹 | `/ranking` | 전체 평점(RP) 랭킹 |
| 캐릭터 랭킹 | `/ranking/characters` | 캐릭터별 승수/승률/킬/어시/경험치 랭킹 |
| 결투장 랭킹 | `/ranking/tsj` | 근거리/원거리 결투장 랭킹 |
| 캐릭터 | `/characters`, `/characters/[id]` | 캐릭터 목록 + 지표별 상위 랭커 |
| 아이템 | `/items`, `/items/[id]` | 배틀 아이템 검색(등급·캐릭터 필터) + 상세 |

---

## Vercel 배포

1. GitHub 저장소에 푸시
2. [Vercel](https://vercel.com) 에서 **New Project** → 저장소 import
3. **Environment Variables** 에 `NEOPLE_API_KEY` 추가
4. Deploy

> Neople API 서버는 한국(ap-northeast-2) 리전에 있습니다. Vercel 기본 리전이
> 멀면 함수 리전을 `icn1`(서울)로 지정하면 응답이 빨라집니다.

---

## 프로젝트 구조

```
src/
├── app/                      # App Router 페이지 (모두 서버 컴포넌트 기반)
│   ├── page.tsx              # 홈 (검색)
│   ├── search/               # 검색 결과
│   ├── players/[playerId]/   # 프로필 + 전적
│   ├── matches/[matchId]/    # 매치 상세
│   ├── ranking/              # 평점/캐릭터/결투장 랭킹
│   ├── characters/           # 캐릭터 목록/상세
│   └── items/                # 아이템 검색/상세
├── lib/
│   ├── neople.ts             # ⭐ 서버 전용 API 클라이언트 (키 보호·캐싱·에러·정규화 호출)
│   ├── types.ts              # 타입: neople-openapi-types(라이브러리) 베이스 + 앱 확장
│   ├── normalize.ts          # ⭐ 원시 응답 → 뷰 모델 정규화 (flat/nested 양쪽 흡수)
│   ├── constants.ts          # 게임타입/티어/희귀도/랭킹지표 상수
│   ├── images.ts             # Neople 이미지 URL 헬퍼
│   └── format.ts             # KDA/승률/날짜 포맷 유틸
├── components/               # 공용 UI 컴포넌트
scripts/
└── test-normalize.ts         # 정규화 단위 테스트 (npm test)
```

### 테스트

```bash
npm test        # normalize.ts 단위 테스트 (API 키 불필요, flat/nested 32케이스)
```

### 실 데이터 디버깅 — `/api/debug`

실제 응답 JSON을 그대로 보고 싶을 때 사용하는 개발용 라우트입니다. `apikey` 는 서버에서만
붙으므로 브라우저 URL 에 키가 노출되지 않습니다. (프로덕션에서는 자동 비활성화)

```
http://localhost:3000/api/debug?path=/matches/<matchId>
http://localhost:3000/api/debug?path=/players/<playerId>/matches&gameTypeId=normal
http://localhost:3000/api/debug?path=/players/<playerId>
http://localhost:3000/api/debug?path=/ranking/ratingpoint&playerId=<playerId>
```

`path` 외의 쿼리 파라미터는 그대로 Neople API 로 전달됩니다. 화면 숫자가 이상하면 이걸로
실제 JSON 을 확인하고 `lib/normalize.ts` 의 필드 매핑을 맞추면 됩니다.

### 사이퍼즈 API 스키마 반영

응답 구조는 실제 스키마에 맞춰져 있습니다: 매치 목록의 `matches` 는 루트의 flat 배열,
매치 상세의 `teams[].players[]` 는 플레이어별 스탯이 flat(승패는 팀 단위), 플레이어 티어·RP·
공식전 전적은 `ratingpoint` 랭킹(`playerId`)에서 가져옵니다. **일반전은 통산 집계 API 가 없어**
프로필의 "공식전 전적"은 랭킹 기반이고, 일반전은 최근 매치 목록(90일)으로 표시합니다.

### 캐싱 전략

`lib/neople.ts` 의 `TTL` 에서 데이터 성격별 캐시 시간을 조정합니다
(Next.js `fetch` revalidate 기반):

- 캐릭터 목록: 24시간 · 아이템 상세: 6시간 · 플레이어/매치: 1~30분 · 랭킹: 1분

---

## 타입 구조 — 라이브러리 베이스 + 확장

타입은 **[`neople-openapi-types`](https://www.npmjs.com/package/neople-openapi-types)**
패키지를 베이스로 사용합니다. 이 패키지는 던파/사이퍼즈 API의 TypeScript 타입 정의만
제공하며(HTTP 클라이언트·UI 없음), 사이퍼즈 타입은 `Cyphers` 네임스페이스로 노출됩니다.

`src/lib/types.ts` 는 이 라이브러리 타입을 **베이스로 두고** 앱에서 필요한 필드를
`extends`/`Pick` 으로 확장합니다. 예:

```ts
import type { Cyphers, ApiResponse } from "neople-openapi-types";

// 라이브러리 PlayerInfo 를 그대로 상속하고 앱 필드만 추가
export interface PlayerDetail extends Cyphers.PlayerInfo {
  tierName?: string;
  ratingPoint?: number;
  records?: PlayerRecord[];
  // 👉 필요한 필드는 여기에 그냥 추가하면 됩니다 (라이브러리 원본은 안 건드림)
}
```

각 interface 안의 `// 여기에 추가` 주석 지점에 필드를 넣으면 됩니다.

### flat / nested 정규화 (`normalize.ts`)

라이브러리 타입은 매치/랭킹 데이터를 **평평하게(flat)** 정의하지만, 실제 API 는
일부를 **중첩(nested: `playInfo`, `player`)** 해서 줄 수 있습니다. 어느 쪽이 맞는지는
실제 응답으로만 확정되므로, `lib/normalize.ts` 가 **두 형태를 모두 흡수**해 항상 동일한
뷰 모델로 변환합니다. 덕분에 실제 구조가 어느 쪽이든 UI 코드는 그대로 동작합니다.
이 정규화 로직은 `npm test` 로 flat/nested 양쪽을 검증합니다.

> 키를 넣고 돌려본 뒤 숫자가 비어 보이면, 브라우저 네트워크 탭에서 실제 JSON을 확인하고
> `normalize.ts` 의 필드 매핑만 살짝 맞춰주면 됩니다. (예: `score` 대신 다른 키를 쓰는 경우)

---

## Phase 2 로드맵 — 메타 통계 (직접 집계)

Neople 오픈API는 **개별 조회**만 제공합니다. "상위 티어 포지션별 픽률", "캐릭터별
평균 아이템 빌드", "티어 구간 승률 메타" 같은 **집계 통계 엔드포인트는 없습니다.**
이건 직접 데이터를 모아 계산해야 합니다:

1. **수집**: 평점 랭킹 API로 상위 N명 → 각 플레이어 매치 리스트 → 매치 상세를 크롤링
2. **저장**: 매치를 DB(Postgres/Supabase 등)에 저장 (matchId 기준 중복 제거)
3. **집계**: 저장된 매치를 배치로 집계 → 포지션별 픽률·승률, 아이템 채택률 등 산출
4. **스케줄링**: cron(예: Vercel Cron)으로 주기적 갱신
5. **표시**: `/meta` 같은 페이지에서 집계 결과 렌더링

즉 **현재 앱(API 프록시) + 수집 파이프라인(DB + 배치 + 집계)** 두 층 구조가 됩니다.
현재 코드베이스는 `lib/neople.ts` 로 API 접근이 모듈화되어 있어, 수집기가 이 함수들을
재사용해 Phase 2를 얹기 쉽습니다.

---

## 라이선스 / 고지

본 프로젝트는 학습·팬 목적의 비공식 사이트 예제입니다. 데이터 제공은 Neople 오픈API,
게임 저작권은 Neople/넥슨에 있습니다.
