export const CLASS_TYPE_LABEL = {
  ZERO:   "ZERO CLASS",
  UP:     "UP CLASS",
  PRO:    "PRO CLASS",
  MASTER: "MASTER CLASS",
};

export const CLASS_TYPE_COLOR = {
  ZERO:   { bg: "color-mix(in srgb, #3b82f6 22%, #1f1d26)",  fg: "#93c5fd" },
  UP:     { bg: "color-mix(in srgb, #f97316 22%, #1f1d26)",  fg: "#fb923c" },
  PRO:    { bg: "color-mix(in srgb, #818cf8 22%, #1f1d26)", fg: "#a5b4fc" },
  MASTER: { bg: "color-mix(in srgb, #f43f5e 22%, #1f1d26)",   fg: "#fb7185" },
};

// All (classType, stepLevel) combos that have a PricingConfig row.
// Sub-variants (UP_11..14) inherit pricing from their parent (UP_1).
// PRO 매핑: 1=시네마틱(step6), 2=뮤직영상 마스터(step5), 3=멀티영상(step7), 4=AI 그림책(step8).
// MASTER 매핑: 1=광고영상(step4), 2=프리프로덕션(step3).
export const PRICING_SLOTS = [
  { classType: "ZERO",   stepLevel: 0 },
  { classType: "UP",     stepLevel: 1 },
  { classType: "UP",     stepLevel: 2 },
  { classType: "UP",     stepLevel: 3 },
  { classType: "PRO",    stepLevel: 1 },
  { classType: "PRO",    stepLevel: 2 },
  { classType: "PRO",    stepLevel: 3 },
  { classType: "PRO",    stepLevel: 4 },
  { classType: "MASTER", stepLevel: 1 },
  { classType: "MASTER", stepLevel: 2 },
];

// Options shown in the 회차 등록 dropdown. UP 1 은 단일 과정(AI영상기초다지기)으로 통합.
export const SESSION_STEP_OPTIONS = [
  { classType: "ZERO",   stepLevel: 0 },
  { classType: "UP",     stepLevel: 1 },
  { classType: "UP",     stepLevel: 2 },
  { classType: "UP",     stepLevel: 3 },
  { classType: "PRO",    stepLevel: 1 },
  { classType: "PRO",    stepLevel: 2 },
  { classType: "PRO",    stepLevel: 3 },
  { classType: "PRO",    stepLevel: 4 },
  { classType: "MASTER", stepLevel: 1 },
  { classType: "MASTER", stepLevel: 2 },
];

// Resolve a session stepLevel to the parent that owns pricing.
// Defensive fallback for any legacy UP_11..14 row (통합 전 데이터) → 1.
export function parentStepLevel(classType, stepLevel) {
  if (classType === "UP" && stepLevel >= 11 && stepLevel <= 14) return 1;
  return stepLevel;
}

// (classType, stepLevel) → 코스 제목.
// 회차등록 셀렉트 등에서 "UP 2단계 · 뮤직영상 만들기" 처럼 풀네임으로 보여주기 위한 매핑.
// stepLabel.js 의 STEP_TITLE 과 의미상 동일하지만, 여기는 ClassSession 슬롯 키
// (classType+stepLevel) 기준이라 별도로 둔다.
const SESSION_COURSE_TITLE = {
  UP_1:     "AI영상기초다지기",
  UP_2:     "뮤직영상 만들기",
  UP_3:     "인트로영상 만들기",
  PRO_1:    "시네마틱 5컷 다이얼로그",
  PRO_2:    "뮤직영상 마스터",
  PRO_3:    "멀티영상 만들기",
  PRO_4:    "AI 그림책 만들기",
  MASTER_1: "광고영상 제작",
  MASTER_2: "프리프로덕션",
};

// "ZERO" / "UP 1단계 · AI영상기초다지기" / "UP 2단계 · 뮤직영상 만들기" / "PRO 1단계 · 시네마틱 5컷 다이얼로그"
export function formatClassLabel(classType, stepLevel) {
  if (classType === "ZERO") return "ZERO";
  const base = `${classType} ${stepLevel}단계`;
  const title = SESSION_COURSE_TITLE[pricingKey(classType, stepLevel)];
  return title ? `${base} · ${title}` : base;
}

export function pricingKey(classType, stepLevel) {
  return `${classType}_${stepLevel ?? 0}`;
}

// pricingMap: { "UP_1": row, "UP_2": row, ... }
// Sub-variants (UP_11..14) automatically fall back to the parent (UP_1) row.
export function lookupPricing(pricingMap, classType, stepLevel) {
  const direct = pricingMap[pricingKey(classType, stepLevel)];
  if (direct) return direct;
  const parent = parentStepLevel(classType, stepLevel);
  if (parent !== stepLevel) {
    return pricingMap[pricingKey(classType, parent)] || null;
  }
  return null;
}

// Build the lookup map from a flat array of PricingConfig rows.
export function buildPricingMap(rows) {
  const m = {};
  for (const r of rows || []) {
    m[pricingKey(r.classType, r.stepLevel)] = r;
  }
  return m;
}

export function attendeeCount(enrollments) {
  return enrollments.filter((e) => e.status === "ATTENDED").length;
}

export function applicantCount(enrollments) {
  return enrollments.filter((e) => e.status !== "CANCELLED").length;
}

export function calculateRevenue(attendees, pricing, options = {}) {
  const total = (pricing?.pricePerPerson ?? 0) * attendees;
  const toolb     = Math.round(total * (pricing?.toolbShare     ?? 0));
  const main      = Math.round(total * (pricing?.mainShare      ?? 0));
  let   assistant = Math.round(total * (pricing?.assistantShare ?? 0));
  let   reserve   = Math.round(total * (pricing?.reserveShare   ?? 0));

  // When `assistantToReserve` is set on the session (i.e. no 보조강사 assigned and admin
  // chose 충당금 instead), fold the assistant share into the reserve.
  if (options.assistantToReserve) {
    reserve += assistant;
    assistant = 0;
  }

  return { total, toolb, main, assistant, reserve };
}

export function viewerRevenueScope(viewer, session) {
  const isSuper     = viewer.role === "SUPER_ADMIN";
  const isMain      = session.mainInstructorId      === viewer.id;
  const isAssistant = session.assistantInstructorId === viewer.id;
  return {
    isSuper,
    isMain,
    isAssistant,
    canSeeTotal:     isSuper,
    canSeeToolb:     isSuper,
    canSeeMain:      isSuper || isMain,
    canSeeAssistant: isSuper || isAssistant,
    canSeeReserve:   isSuper,
    canSeeAnything:  isSuper || isMain || isAssistant,
  };
}

export function maskRevenue(revenue, scope) {
  return {
    total:     scope.canSeeTotal     ? revenue.total     : null,
    toolb:     scope.canSeeToolb     ? revenue.toolb     : null,
    main:      scope.canSeeMain      ? revenue.main      : null,
    assistant: scope.canSeeAssistant ? revenue.assistant : null,
    reserve:   scope.canSeeReserve   ? revenue.reserve   : null,
  };
}

export function formatKRW(n) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("ko-KR") + "원";
}
