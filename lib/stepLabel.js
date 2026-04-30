// Map a stepAccess numeric code to a human-readable class label.
// Update this single map when class numbering changes — the rest of the
// app should consume `stepLabel(code)` rather than hard-code strings.

const STEP_LABEL = {
  100: "ZERO",
  // UP class
  1:  "UP 1",          // 영상기초다지기 (umbrella)
  11: "UP 1-1",        //  · 말하는
  12: "UP 1-2",        //  · 춤추는
  13: "UP 1-3",        //  · 날아가는
  14: "UP 1-4",        //  · 동물 인터뷰
  2:  "UP 2",          // 뮤직영상
  21: "UP 3",          // 인트로영상 (승격)
  // PRO class
  6:  "PRO 1",         // 시네마틱 5컷
  4:  "PRO 2",         // 광고영상
  5:  "PRO 3",         // 유튜브 수익화 (준비중)
  3:  "PRO 4",         // 프리프로덕션 (구 스토리영상 자리, PRO로 이전)
};

export function stepLabel(code) {
  return STEP_LABEL[code] || `Step ${code}`;
}

// stepAccess code -> course title shown in mypage / email body.
const STEP_TITLE = {
  1: "입문 과정",
  2: "중급 과정",
  3: "고급 과정",
};

export function stepCourseTitle(code) {
  return STEP_TITLE[code] || "";
}
