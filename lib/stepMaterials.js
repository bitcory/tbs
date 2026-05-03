// 단계별 강의자료 Notion 링크 설정 파일
//
// 각 단계의 links 배열에 { label, url } 형태로 추가하세요.
// - label: 이메일과 버튼에 보일 이름 (예: "Part 1", "실습 자료")
// - url: Notion 공유 링크 (tracking 쿼리 ?source=copy_link 는 빼도 됨)
//
// links 배열이 비어 있으면 버튼이 "준비중"으로 비활성화됩니다.

import { stepLabel, stepCourseTitle } from "./stepLabel";

export const STEP_MATERIALS = {
  100: {
    // ZERO CLASS
    links: [],
  },
  1: {
    // UP 1 · 영상 기초 다지기 (parent / legacy 혼합) — 모든 1단계 자료 포함
    links: [
      {
        label: "말하는 영상",
        url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step1-34dab89ffa7880cba66fd862c3f76c5d",
      },
      {
        label: "동물 인터뷰",
        url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step1-e43ab89ffa78832db517812dbbf43122?pvs=73",
      },
    ],
  },
  11: {
    // UP 1-1 · 말하는 영상
    links: [
      {
        label: "말하는 영상",
        url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step1-34dab89ffa7880cba66fd862c3f76c5d",
      },
    ],
  },
  12: {
    // UP 1-2 · 춤추는 (준비중)
    links: [],
  },
  13: {
    // UP 1-3 · 날아가는 (준비중)
    links: [],
  },
  14: {
    // UP 1-4 · 동물 인터뷰
    links: [
      {
        label: "동물 인터뷰",
        url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step1-e43ab89ffa78832db517812dbbf43122?pvs=73",
      },
    ],
  },
  2: {
    // UP 2 · 뮤직영상 만들기
    links: [
      {
        label: "뮤직영상 만들기",
        url: "https://www.notion.so/Step-2-34eab89ffa7880b19f83d70b59d46463?source=copy_link",
      },
    ],
  },
  21: {
    // UP 3 · 인트로영상 만들기
    links: [],
  },
  6: {
    // PRO 1 · 시네마틱 5컷 다이얼로그
    links: [],
  },
  4: {
    // PRO 2 · 광고영상 만들기
    links: [],
  },
  3: {
    // PRO 4 · 프리프로덕션
    links: [],
  },
};

// Steps shown in mypage, in display order. UI iterates this list.
export const MYPAGE_STEP_ORDER = [100, 1, 2, 21, 6, 4, 3];

// (classType, stepLevel) on ClassSession → STEP_MATERIALS key
// UP 1 sub-variants 가 각자의 자료를 갖도록 1:1 매핑 (UP_1 은 legacy/혼합).
const SESSION_TO_MATERIAL_STEP = {
  ZERO_0: 100,
  UP_1: 1,
  UP_11: 11,
  UP_12: 12,
  UP_13: 13,
  UP_14: 14,
  UP_2: 2,
  UP_3: 21,
  PRO_1: 6,
  PRO_2: 4,
  PRO_4: 3,
  // PRO_3 (유튜브 수익화) — STEP_MATERIALS 미정 → null
};

export function sessionMaterialsStep(classType, stepLevel) {
  return SESSION_TO_MATERIAL_STEP[`${classType}_${stepLevel ?? 0}`] ?? null;
}

export function getStepMaterials(step) {
  const m = STEP_MATERIALS[step];
  if (!m) return null;
  // Title is derived dynamically so class label changes propagate automatically.
  const courseTitle = stepCourseTitle(step);
  const title = courseTitle ? `${stepLabel(step)} · ${courseTitle}` : stepLabel(step);
  return { ...m, title };
}

export function hasStepMaterials(step) {
  const m = STEP_MATERIALS[step];
  return !!m && m.links.length > 0;
}
