# TB STUDY Project

## Project Overview
- Next.js 15 기반 AI 영상 제작 학습 사이트
- 메인 페이지: `/public/toolblab/main.html` (iframe으로 로드)
- 강의 페이지: `/app/lecture/step1~3/page.js`
- 배포: Vercel (`tbs.aitoolb.com`), GitHub: `bitcory/tbs`

## Video Thumbnail Workflow

영상을 추가하거나 교체할 때 아래 절차를 따른다.

### 1. Dropbox URL 준비
- Dropbox 공유 링크에서 `dl=0`을 `raw=1`로 변경
- 예: `https://www.dropbox.com/scl/fi/.../video.MP4?rlkey=...&st=...&raw=1`

### 2. 썸네일 추출 (ffmpeg)
```bash
ffmpeg -y -ss 1 -i "DROPBOX_RAW_URL" -vframes 1 -q:v 2 -update 1 public/images/thumbs/stepN-M.jpg
```
- `-ss 1`: 1초 지점 프레임 캡처 (원하는 시점으로 변경 가능)
- `-q:v 2`: JPEG 고품질
- 파일명 규칙: `step{단계번호}-{영상순서}.jpg` (예: `step2-1.jpg`, `step3-2.jpg`)

### 3. STEP_MEDIA에 등록
`/public/toolblab/main.html`의 `STEP_MEDIA` 객체에 항목 추가/수정:

```js
const STEP_MEDIA = {
  step2: [
    {
      title: '섹션 제목',
      // layout: 'single',  // 세로 영상 등 1열 레이아웃 필요 시
      items: [
        { type: 'video', src: 'DROPBOX_RAW_URL', poster: '/images/thumbs/step2-1.jpg' },
        { type: 'video', src: 'DROPBOX_RAW_URL', poster: '/images/thumbs/step2-2.jpg' },
      ],
    },
  ],
};
```

**Item types:**
- `{ type: 'video', src, poster }` — 동영상 (poster는 썸네일 이미지 경로)
- `{ type: 'image', src, alt }` — 정적 이미지
- `{ type: 'placeholder', label }` — 빈 슬롯 (재생 아이콘 + 텍스트)

**Section options:**
- `layout: 'single'` — 세로/혼합 영상용 1열 레이아웃 (가로세로 비율 자동 맞춤)
- 미지정 시 2열 그리드 (가로 영상 기본)

### 4. 커밋 & 배포
```bash
git add public/images/thumbs/ public/toolblab/main.html
git commit -m "Add step N video thumbnails"
git push
```
Vercel이 자동 배포함.

## Current Media Map

| 단계 | 슬롯 | 타입 | 썸네일 |
|------|------|------|--------|
| Step 1 | 1~4 | image | 없음 (이미지 직접 표시) |
| Step 2 | 1 | video | `thumbs/step2-1.jpg` |
| Step 2 | 2 | video | `thumbs/step2-2.jpg` |
| Step 3 | 1 | video | `thumbs/step3-1.jpg` |
| Step 3 | 2 | video | `thumbs/step3-2.jpg` |
| Step 4 | - | placeholder | - |
| Step 5 | 1 | video (single) | `thumbs/step5-1.jpg` |

## Step Routes & Access

모든 강의 페이지는 **로그인 + 관리자(STAFF/SUPER_ADMIN) 권한 토글** 방식으로 접근 제어한다.
접근 코드(access code) 방식은 더 이상 사용하지 않는다.

| 단계 | 라우트 | `stepAccess` 값 | 설명 |
|------|--------|----------------|------|
| ZERO CLASS 전체 | `/zero/*` | `100` | 5개 루트 공용 (구글/FLOW/AI사진/AI영상/캡컷) |
| Step 1-1 | `/lecture/step1?v=talking` | `11` | 영상기초다지기 · 말하는 프롬프트 |
| Step 1-2 | `/lecture/step1?v=dance` | `12` | 영상기초다지기 · 춤추는 영상 프롬프트 |
| Step 1-3 | `/lecture/step1?v=fly` | `13` | 영상기초다지기 · 날아가는 영상 프롬프트 |
| Step 1-4 | `/lecture/step1?v=interview` | `14` | 영상기초다지기 · 동물 인터뷰 프롬프트 |
| Step 2 | `/lecture/step2` | `2` | 뮤직 영상 만들기 |
| Step 2-1 | `/lecture/step2-1` | `21` | 인트로 영상 만들기 (Step 2 하위) |
| Step 6 | `/lecture/step6` | `6` | PRO 1 · 시네마틱 5컷 다이얼로그 (캐릭터 A/B + S01~S05) |
| Step 5 | `/lecture/step5` | `5` | PRO 2 · 유튜브 창작과정 (구 유튜브 수익화과정 · 뮤직영상 프롬프트 마스터 + S01~Snn, part1+part2 병합) |
| Step 7 | `/lecture/step7` | `7` | PRO 3 · 멀티영상 만들기 (Cinematic Storyboard v4 · A 12패널 / B 6+6패널, 다국어 단일 출력) |
| Step 8 | `/lecture/step8` | `8` | PRO 4 · AI 그림책 만들기 (picturebook 서재 뷰어 — 책장/캐릭터/컷/표지 + JSON 라이브러리 불러오기) |
| Step 4 | `/lecture/step4` | `4` | MASTER 1 · 광고영상 만들기 (Hook/Build/Climax/CTA) |
| Step 3 | `/lecture/step3` | `3` | MASTER 2 · 프리프로덕션 (구 스토리 영상 · 기/승/전/결) |

> **Step 1 구조**: `/lecture/step1/page.js` 는 서버 컴포넌트 게이트로, `?v=` 쿼리를 읽어 `requireStepAccess([11|12|13|14, 1])` 로 variant별 접근을 강제한 뒤 `Step1Client` 에 `variant` prop 으로 전달한다. 레거시 `1` 을 보유한 사용자는 네 variant 모두 접근 가능(하위 호환).
>
> **ZERO CLASS 인코딩**: 3자리 (10N). 하위 스텝이 생겨도 동일 prefix 유지.

### 회차/단가 슬롯 ↔ stepAccess 매핑

회차등록·단가관리·일정카드 등은 `ClassSession`/`PricingConfig` 의 `(classType, stepLevel)` 슬롯 키를 쓴다. stepAccess 코드와는 별개로 슬롯이 매핑돼 있으니 헷갈리지 말 것.

| 슬롯 (classType_stepLevel) | stepAccess 코드 | 강의 |
|---|---|---|
| `ZERO_0` | `100` | ZERO CLASS 전체 |
| `UP_1` (sub: `UP_11~14`) | `1` (sub: `11~14`) | UP 1 · 영상기초다지기 |
| `UP_2` | `2` | UP 2 · 뮤직영상 |
| `UP_3` | `21` | UP 3 · 인트로영상 |
| `PRO_1` | `6` | PRO 1 · 시네마틱 5컷 |
| `PRO_2` | `5` | PRO 2 · 유튜브 창작과정 |
| `PRO_3` | `7` | PRO 3 · 멀티영상 |
| `PRO_4` | `8` | PRO 4 · AI 그림책 |
| `MASTER_1` | `4` | MASTER 1 · 광고영상 |
| `MASTER_2` | `3` | MASTER 2 · 프리프로덕션 |

- 라벨은 `lib/pricing.js#formatClassLabel` 가 단일 진실 원천 (회차 셀렉트/단가카드/일정카드 모두 거침).
- 슬롯↔stepAccess 변환은 `lib/stepMaterials.js#SESSION_TO_MATERIAL_STEP` 사용.
- 새 슬롯을 추가할 때는 `PRICING_SLOTS` / `SESSION_STEP_OPTIONS` / `SESSION_COURSE_TITLE` (pricing.js) 와 `SESSION_TO_MATERIAL_STEP` (stepMaterials.js) 를 함께 갱신.

### 접근 제어 규칙 (새 페이지에도 동일 적용)

1. 각 강의 라우트 폴더에 `layout.js` 를 만들고 `requireStepAccess(<값>)` 호출.
   ```js
   // app/lecture/stepN/layout.js
   import { requireStepAccess } from "@/lib/access";
   export default async function StepNLayout({ children }) {
     await requireStepAccess(N);       // 예: 1, 2, 21, 3
     return children;
   }
   ```
2. `stepAccess` 는 `prisma/schema.prisma` 의 `Int[]` 이다.
   - UP CLASS 메인 단계는 한자리 정수 (2, 3, 4, 5)
   - **UP CLASS 하위 단계는 두 자리 인코딩** (예: Step 1-2 → `12`, Step 2-1 → `21`, Step 3-2 → `32`)
   - **ZERO CLASS 는 단일 코드 `100`** (5개 루트가 공유 — 허용 시 전체 접근)
   - 새 서브스텝을 만들 때 같은 규칙을 따른다.
3. `app/admin/page.js` 의 `ZERO_STEP` / `STEP1_OPTIONS` / `SINGLE_STEPS` / `PRO_STEPS` / `MASTER_STEPS`
   값·배열을 수정하면 자동으로 드롭다운·토글 컬럼이 노출된다.
   (`STAFF` / `SUPER_ADMIN` 은 `requireStepAccess` 에서 자동 통과.)
4. 권한 없는 사용자는 `/no-access?step=<값>` 으로 리디렉션된다.

### 새 페이지 체크리스트
- [ ] `app/lecture/<route>/layout.js` 에 `requireStepAccess(N)` 추가
- [ ] `app/admin/page.js` 의 테이블 헤더/토글 루프에 값 추가
- [ ] `public/toolblab/main.html` 의 `STEPS` 객체에 카드 등록 (URL + ready 플래그)
- [ ] 이 CLAUDE.md 의 Step Routes 표에 한 줄 추가

## Button Interaction Convention (필수)

모든 버튼은 hover lift + active press-in 피드백이 있어야 한다. 전역 유틸리티
`.tb-press`(강조/컬러 버튼용), `.tb-press-soft`(흰·옅은 배경·탭 등 서브 버튼용) 를
`app/globals.css`에서 제공하며, 새로 만드는 페이지/컴포넌트는 아래 규칙을 따른다.

**적용 규칙:**
- 컬러 배경 버튼 (`bg-blue-600`, `bg-[#E60023]`, `hover:opacity-90` 계열, 포인트 CTA) → `tb-press`
- 흰/옅은 배경, 탭, 복사, 닫기 아이콘 버튼 → `tb-press-soft`
- 이미 `tb-pill-primary` / `tb-pill-ghost` (글라스 버튼 styled-jsx) 를 쓰는 버튼은
  재적용 불필요. 새 페이지에서 글라스 버튼을 만들 땐 step1~3 page.js 의 pill
  정의(눌림 시 `translateY(1px) scale(0.94)` + inset shadow)를 그대로 복사해 사용.
- `transition` Tailwind 클래스는 `tb-press`/`tb-press-soft` 가 이미 전환을 포함하므로
  같이 붙이지 않아도 된다.

**새 버튼 예시:**
```jsx
<button className="px-3 py-1.5 rounded-full bg-blue-600 text-white font-bold tb-press">
  실행
</button>
<button className="px-3 py-1.5 rounded-full bg-white border border-[#e2e8f0] text-[#334155] tb-press-soft">
  취소
</button>
```

`main.html` 등 iframe 내부(globals.css 미적용) 에서는 `:hover` 에 lift, `:active` 에
`translateY(1px) scale(0.94)` + `inset 0 2px 4px rgba(0,0,0,0.12)` 정도의 눌림
shadow를 직접 CSS 로 넣는다.

## 운영건의함 & 개인정보 노출 규칙

| 영역 | 규칙 |
|------|------|
| `/mypage/suggestions` | 본인 글만 조회/수정/삭제. `prisma.suggestion.findMany({ where: { userId: me.id } })` 로만 쿼리 |
| `/admin/suggestions` | `requireSuggestionViewer()` 게이트. SUPER 또는 `User.canViewSuggestions=true` STAFF 만 진입. 작성자 닉네임만 표시(이메일/전화 미노출). 삭제는 SUPER 만 |
| 전화번호 노출 | SUPER 만 평문, STAFF 는 `lib/format.js#maskPhone` (앞3-****-뒤4) 사용. STAFF 의 `/admin` 검색에서도 phone 컬럼 제외 |
| 권한 부여 | `app/admin/page.js` 운영진 탭의 "건의함 열람" 토글 (`toggleSuggestionViewer` server action, `requireSuperAdmin` 게이트) |

새 관리자 페이지/컴포넌트에서 회원의 `phone` 을 표시할 때는 반드시
`isSuper ? phone : maskPhone(phone)` 패턴을 사용한다 (본인 행 제외).

## Key Files
- `/public/toolblab/main.html` — 메인 랜딩 (히어로 + 카드 캐러셀 + 미디어 패널)
- `/app/page.js` — iframe 래퍼
- `/app/layout.js` — 메타태그, 파비콘, OG 설정
- `/app/lecture/step{1,2,2-1,3,4}/page.js` — 각 강의 페이지
- `/app/admin/page.js` — 회원 권한/단계 접근 토글 관리
- `/public/images/thumbs/` — 영상 썸네일
- `/public/images/step1/` — Step 1 참고 이미지
