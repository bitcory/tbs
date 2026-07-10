// Map a stepAccess numeric code to a human-readable class label.
// Update this single map when class numbering changes — the rest of the
// app should consume `stepLabel(code)` rather than hard-code strings.

const STEP_LABEL = {
  100: "ZERO CLASS",
  // UP class
  1:  "UP 1단계",      // AI영상기초다지기 (통합)
  2:  "UP 2단계",      // 뮤직영상
  21: "UP 3단계",      // 인트로영상 (승격)
  // PRO class
  6:  "PRO 1단계",     // 시네마틱 5컷
  5:  "PRO 2단계",     // 뮤직영상 마스터 (구 유튜브 창작과정)
  7:  "PRO 3단계",     // 멀티영상
  8:  "PRO 4단계",     // AI 그림책 만들기
  // MASTER class
  4:  "MASTER 1단계",  // 광고영상
  3:  "MASTER 2단계",  // 프리프로덕션
};

export function stepLabel(code) {
  return STEP_LABEL[code] || `Step ${code}`;
}

// stepAccess code -> course title shown in mypage / email body.
const STEP_TITLE = {
  1:  "AI영상기초다지기",
  2:  "뮤직영상 만들기",
  21: "인트로영상 만들기",
  6:  "시네마틱 5컷 다이얼로그",
  5:  "뮤직영상 마스터",
  7:  "멀티영상 만들기",
  8:  "AI 그림책 만들기",
  4:  "광고영상 제작",
  3:  "프리프로덕션",
  100: "ZERO CLASS",
};

export function stepCourseTitle(code) {
  return STEP_TITLE[code] || "";
}
