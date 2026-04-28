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

export function attendeeCount(enrollments) {
  return enrollments.filter((e) => e.status === "ATTENDED").length;
}

export function applicantCount(enrollments) {
  return enrollments.filter((e) => e.status !== "CANCELLED").length;
}

export function calculateRevenue(attendees, pricing) {
  const total = (pricing?.pricePerPerson ?? 0) * attendees;
  return {
    total,
    toolb:     Math.round(total * (pricing?.toolbShare     ?? 0)),
    main:      Math.round(total * (pricing?.mainShare      ?? 0)),
    assistant: Math.round(total * (pricing?.assistantShare ?? 0)),
  };
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
    canSeeAnything:  isSuper || isMain || isAssistant,
  };
}

export function maskRevenue(revenue, scope) {
  return {
    total:     scope.canSeeTotal     ? revenue.total     : null,
    toolb:     scope.canSeeToolb     ? revenue.toolb     : null,
    main:      scope.canSeeMain      ? revenue.main      : null,
    assistant: scope.canSeeAssistant ? revenue.assistant : null,
  };
}

export function formatKRW(n) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("ko-KR") + "원";
}
