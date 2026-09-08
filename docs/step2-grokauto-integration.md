# Step 2 × GrokAuto 연동 — 조사 결과 및 보류된 개조 계획

> 상태: **보류(설계만 완료, 코드 미작성)**
> 최초 조사: 2026-08-19
> 재개 트리거: 사용자가 "개조하자"라고 말하면 이 문서부터 읽고 이어서 진행한다.

---

## 1. 원래 요청

UP 2 · 뮤직영상 만들기(`/lecture/step2`) 페이지의 도입/전개/절정/결말 씬 카드에 다음을 추가하고 싶다는 요청:

- 이미지 프롬프트 **좌측에 이미지창** — 업로드 / 드래그앤드롭 / 복사붙여넣기로 이미지 투입
- 영상 프롬프트 **좌측에 영상창** + **개별 영상생성 버튼**
- 상단에 **전체 영상 생성하기** 버튼
- 그록에서 영상을 만들어 페이지로 회수
- 전체 다운로드 → **ZIP 저장**
- 헤더에 자동화 설정 버튼

초기에는 "템퍼몽키 유저스크립트를 새로 작성"하는 방향으로 잡았으나, **조사 결과 이미 완성된 크롬 확장이 있어 방향을 전환했다.**

---

## 2. 핵심 발견 — GrokAuto 확장이 이미 존재한다

**경로: `/Volumes/tb02/chrome/grokauto`** (별도 git 저장소)

- Chrome Extension Manifest V3, **v3.3.12**
- React + TypeScript + Vite + Zustand
- grok.com 배치 이미지/영상 생성 자동화
- 유지보수 활발 — 2026-07 그록 프론트엔드 개편(캐러셀 지연 마운트, asset 403→206) 대응까지 반영돼 있음

### 2.1 초기에 우려했던 문제가 이미 다 해결돼 있음

| 우려했던 문제 | GrokAuto의 해법 | 근거 |
|---|---|---|
| 영상 URL이 `blob:`이면 URL만 회수해선 재생·다운로드 불가 | 그록 영상은 **실제 https URL** (`.../generated_video[_hd].mp4`). `src.startsWith('http')`로 검증까지 함 | `src/content/dom/waiters.ts:604~625` |
| 백그라운드 탭 타이머 스로틀링(5분 후 1분에 1회)으로 완료 감지 지연 | **무음(gain 0.0001) 오실레이터**로 탭을 "미디어 재생 중" 상태로 유지해 스로틀링 회피 | `src/content/keepAwake.ts` |
| 탭이 숨겨진 동안 타임아웃이 잘못 흐름 | 탭 hidden 시 타임아웃 **일시정지**, visible 되면 재개 | `waiters.ts` `onVisible` |
| 모더레이션 차단 / 온보딩 모달로 결과 DOM이 가려짐 | `svg.lucide-eye-off` 감지 → `content-hidden` 반환, `dismissBlockingDialog()` | `waiters.ts` `check()` |

### 2.2 TB STUDY 스토리보드 JSON을 그대로 먹는다

`cinematic-intro` 모드의 파서(`src/store/useAppStore.ts:319~348`)가 읽는 필드:

```
json.opening_sequence?.scenes ?? json.scenes
  ├ scene_number
  ├ title
  ├ type
  ├ prompts.image.prompt
  ├ prompts.video.prompt
  └ prompts.video.duration
meta.aspect_ratio  →  videoSettings.aspectRatio 자동 반영
```

**TB step2의 스토리보드 JSON 구조와 정확히 일치한다.** 변환 없이 붙여넣기만 하면 된다.

### 2.3 이미지 → 영상 1:1 매칭이 이미 구현돼 있음

`src/popup/components/ActionButtons.tsx:84-86`
```ts
if (mode === 'cinematic-intro') {
  effectiveMode = cinematicIntro.generationTarget === 'video'
    ? 'frame-to-video'      // 영상 = 이미지에서 출발
    : 'image-to-image';
}
```

`src/popup/components/ActionButtons.tsx:112-117`
```ts
} else if (mode === 'cinematic-intro' && generationTarget === 'video') {
  const img = uploadedImages[i];   // i번째 업로드 이미지
  if (img) images = [img];         // ↔ i번째 씬의 영상 프롬프트
}
```

즉 **"이미지 넣고 그 이미지로 영상 생성"이 그대로 구현돼 있다.** 새로 짤 자동화 로직이 없다.

참고: 이미지 생성 모드일 때는 레퍼런스가 **공유 키** `img_cinematic_ref` 하나로 들어간다 (`ActionButtons.tsx:177-178`). 영상 모드는 프롬프트별 키 `img_${prompt.id}` 를 쓴다 (`src/content/automator.ts:229-241`).

---

## 3. 지금 당장 쓰는 방법 (코드 수정 불필요)

1. GrokAuto 사이드패널 → 모드 **`cinematic-intro`**
2. TB step2에 넣는 **스토리보드 JSON을 그대로 붙여넣기**
3. 씬 이미지를 **씬 순서대로** 업로드
4. **영상 생성** 탭 선택 → 시작
5. 결과는 지정 다운로드 폴더에 순번 파일명으로 저장됨

> ⚠️ **가장 중요한 함정: 업로드 순서 = 씬 순서.**
> 인덱스로만 짝짓기 때문에 순서가 하나 밀리면 3번 이미지에 5번 프롬프트가 붙는다.
> 파일명을 `01, 02, 03…` 으로 맞춰둘 것.

---

## 4. 그래서 개조로 얻는 것 (= 남은 작업의 가치)

영상 생성 자체는 지금도 된다. 개조는 **편의성 개선**이다.

| | 현재 | 개조 후 |
|---|---|---|
| 이미지↔프롬프트 매칭 | 업로드 순서 의존 (실수 위험) | 씬 카드에 직접 붙여 순서 실수 원천 차단 |
| JSON 전달 | 손으로 복사 → 사이드패널 붙여넣기 | 버튼 하나 |
| 결과 영상 | 다운로드 폴더에만 저장 | 씬 카드 옆에서 바로 재생 |
| ZIP | — | **불필요.** 확장이 이미 폴더에 순번 파일명으로 저장 중 |

---

## 5. 연동 설계 (미구현)

빠진 건 **TB STUDY 페이지 ↔ 확장 사이의 연결선 하나**뿐이다.
현재 `manifest.json`의 content_scripts는 `*://grok.com/*` 만 매칭하고 `externally_connectable`도 없어서, 웹페이지에서 확장으로 말을 걸 수단이 없다.

### 방안 A — content script 브리지 (권장)

- `manifest.json` content_scripts에 `*://tbs.aitoolb.com/*`, `*://localhost/*` 추가
- 해당 스크립트가 `window.postMessage` ↔ `chrome.runtime` 을 중계
- **장점**: 페이지가 확장 ID를 몰라도 됨 → 웹스토어판/로컬 개발자모드판 양쪽 다 동작
- **단점**: 호스트 권한 추가 → 웹스토어 배포본이면 재심사 필요

### 방안 B — externally_connectable

- 페이지에서 `chrome.runtime.sendMessage(EXT_ID, msg)`
- **장점**: 프로토콜이 깔끔
- **단점**: 확장 ID 고정 필요. 로컬 압축해제 로드는 설치마다 ID가 바뀌어 수강생 배포에 부적합

→ **방안 A 채택 예정.**

### TB step2 페이지 쪽 작업

`app/lecture/step2/page.js` (921줄) 기준:

- 씬 카드의 이미지/영상 프롬프트가 이미 좌우 2단 flex 구조 (`page.js:791~` 이미지, `page.js:819~` 영상) → 각 칸 좌측에 미디어 슬롯 삽입은 깔끔하게 됨
- **업로드 슬롯(업로드+드래그앤드롭+Ctrl+V) 패턴은 이미 구현돼 있으니 재사용**
  - `app/lecture/step6/page.js:418` `UploadSlot` 컴포넌트
  - `app/lecture/step4/page.js:567`, `app/lecture/step5/page.js:154` 동일 패턴
- 이미지 저장은 **IndexedDB** 필요. 현재 캐시(`CACHE_KEY = 'toolb_step2_storyboard'`, `page.js:13`)는 localStorage라 이미지 몇 장이면 5MB 한도를 넘김
- 서버 스토리지는 없음 (`app/api/` 에 auth, desktop 뿐, blob 스토리지 env 없음) → 미디어는 전부 브라우저 로컬
- 확장으로 보낼 이미지는 **1280px 정도로 다운스케일** 후 dataURL 로 전달 (chrome.storage.local 부담 완화)
- 버튼은 프로젝트 규약 준수: 컬러 CTA `tb-press`, 흰/옅은 배경 `tb-press-soft`, 글라스 알약은 step1~3의 `tb-pill-primary`/`tb-pill-ghost` 정의 복사

---

## 6. 재개할 때 먼저 물어봐야 할 것

1. **GrokAuto 확장 코드도 수정 가능한가?** (연동하려면 확장 쪽에 브리지를 넣어야 함 → 두 저장소 동시 수정)
2. **GrokAuto는 크롬 웹스토어 배포 상태인가?** 스토어 스크린샷(`1280.800.png`, `440.280.png`)과 `privacy-policy.html`이 있어 배포본으로 보임. 배포본이면 호스트 권한 추가 = 재심사이므로, 심사 없이 쓸 수 있는 대안도 같이 검토해야 함

## 7. 확정된 사용자 결정

- 영상 회수 방식: **URL만 회수** (2.1에서 https URL임이 확인돼 실현 가능)
- 자동화 소스: 처음엔 "새로 작성"이었으나 **GrokAuto 재사용으로 무효화됨**

## 8. 정리한 것

조사 중 만들었다가 방향 전환으로 폐기한 파일 (커밋되지 않음, 삭제 완료):

- `app/lecture/step2/grokBridge.js` — 템퍼몽키 postMessage 브리지. 확장 방식으로 전환하며 **폐기**
- `app/lecture/step2/mediaStore.js` — IndexedDB 헬퍼. 개조 재개 시 **같은 내용을 다시 쓰면 됨** (스토어명 `toolb_step2_media`, 키 `${sceneId}::image`)
