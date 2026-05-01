// Map a stepAccess numeric code to a human-readable class label.
// Update this single map when class numbering changes — the rest of the
// app should consume `stepLabel(code)` rather than hard-code strings.

const STEP_LABEL = {
  100: "ZERO CLASS",
  // UP class
  1:  "UP 1단계",      // 영상기초다지기 (umbrella)
  11: "UP 1-1단계",    //  · 말하는
  12: "UP 1-2단계",    //  · 춤추는
  13: "UP 1-3단계",    //  · 날아가는
  14: "UP 1-4단계",    //  · 동물 인터뷰
  2:  "UP 2단계",      // 뮤직영상
  21: "UP 3단계",      // 인트로영상 (승격)
  // PRO class
  6:  "PRO 1단계",     // 시네마틱 5컷
  4:  "PRO 2단계",     // 광고영상
  5:  "PRO 3단계",     // 유튜브 수익화 (준비중)
  3:  "PRO 4단계",     // 프리프로덕션 (구 스토리영상 자리, PRO로 이전)
};

export function stepLabel(code) {
  return STEP_LABEL[code] || `Step ${code}`;
}

// stepAccess code -> course title shown in mypage / email body.
const STEP_TITLE = {
  1:  "영상기초다지기",
  2:  "뮤직영상 만들기",
  21: "인트로영상 만들기",
  6:  "시네마틱 5컷 다이얼로그",
  4:  "광고영상 제작",
  3:  "프리프로덕션",
  5:  "유튜브 수익화과정",
  100: "ZERO CLASS",
};

export function stepCourseTitle(code) {
  return STEP_TITLE[code] || "";
}
