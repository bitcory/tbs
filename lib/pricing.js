export const CLASS_TYPE_LABEL = {
  ZERO: "ZERO CLASS",
  UP: "UP CLASS",
  PRO: "PRO CLASS",
};

export const CLASS_TYPE_COLOR = {
  ZERO: { bg: "#dbeafe", fg: "#1d4ed8" },
  UP:   { bg: "#dcfce7", fg: "#166534" },
  PRO:  { bg: "#f3e8ff", fg: "#7e22ce" },
};

// All (classType, stepLevel) combos that have a PricingConfig row.
// Sub-variants (UP_11..14) inherit pricing from their parent (UP_1).
export const PRICING_SLOTS = [
  { classType: "ZERO", stepLevel: 0 },
  { classType: "UP",   stepLevel: 1 },
  { classType: "UP",   stepLevel: 2 },
  { classType: "UP",   stepLevel: 3 },
  { classType: "PRO",  stepLevel: 1 },
  { classType: "PRO",  stepLevel: 2 },
  { classType: "PRO",  stepLevel: 3 },
  { classType: "PRO",  stepLevel: 4 },
];

// UP 1 sub-variants. `stepLevel` 11..14 is stored on ClassSession to
// distinguish the four sub-courses; pricing/materials still resolve to UP_1.
export const UP1_VARIANTS = [
  { stepLevel: 11, label: "UP 1-1 · 말하는" },
  { stepLevel: 12, label: "UP 1-2 · 춤추는" },
  { stepLevel: 13, label: "UP 1-3 · 날아가는" },
  { stepLevel: 14, label: "UP 1-4 · 동물 인터뷰" },
];

// Options shown in the 회차 등록 dropdown. UP 1 은 sub-variant 4종으로만 노출
// (parent UP_1 은 legacy 회차 호환용으로 백엔드에만 존재). Sub-variant 가격은
// parentStepLevel() 로 fallback 해서 계산됨.
export const SESSION_STEP_OPTIONS = [
  { classType: "ZERO", stepLevel: 0 },
  ...UP1_VARIANTS.map((v) => ({ classType: "UP", stepLevel: v.stepLevel })),
  { classType: "UP",   stepLevel: 2 },
  { classType: "UP",   stepLevel: 3 },
  { classType: "PRO",  stepLevel: 1 },
  { classType: "PRO",  stepLevel: 2 },
  { classType: "PRO",  stepLevel: 3 },
  { classType: "PRO",  stepLevel: 4 },
];

// Resolve a session stepLevel to the parent that owns pricing.
// UP_11..14 → 1; everything else returned as-is.
export function parentStepLevel(classType, stepLevel) {
  if (classType === "UP" && stepLevel >= 11 && stepLevel <= 14) return 1;
  return stepLevel;
}

const UP1_LABEL_BY_STEP = Object.fromEntries(UP1_VARIANTS.map((v) => [v.stepLevel, v.label]));

// "UP 1단계" / "UP 1-4 · 동물 인터뷰" / "PRO 2단계" / "ZERO"
export function formatClassLabel(classType, stepLevel) {
  if (classType === "ZERO") return "ZERO";
  if (classType === "UP" && UP1_LABEL_BY_STEP[stepLevel]) {
    return UP1_LABEL_BY_STEP[stepLevel];
  }
  return `${classType} ${stepLevel}단계`;
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
