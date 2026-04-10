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

## Access Codes
- Step 1: 없음 (바로 이동)
- Step 2: `0410`
- Step 3: `0411`
- Step 4, 5: 준비중 (비활성)

## Key Files
- `/public/toolblab/main.html` — 메인 랜딩 (히어로 + 카드 캐러셀 + 미디어 패널)
- `/app/page.js` — iframe 래퍼
- `/app/layout.js` — 메타태그, 파비콘, OG 설정
- `/app/lecture/step{1,2,3}/page.js` — 각 강의 페이지
- `/public/images/thumbs/` — 영상 썸네일
- `/public/images/step1/` — Step 1 참고 이미지
