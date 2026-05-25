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
    links: [
      {
        label: "ZERO CLASS · AI",
        url: "https://shorthaired-stove-8b7.notion.site/ZERO-CLASS-AI-359e5bda8d8480a1b8f1cbacf427ee99",
      },
    ],
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
        url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step1-e43ab89ffa78832db517812dbbf43122",
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
    // UP 1-2 · 춤추는 영상
    links: [
      {
        label: "춤추는 영상",
        url: "https://www.notion.so/TB-UP-CLASS-Step1-8c4ab89ffa7883408189010718d04145",
      },
    ],
  },
  13: {
    // UP 1-3 · 날아가는 영상
    links: [
      {
        label: "날아가는 영상",
        url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step1-361ab89ffa788080844bfacc274f0cdf?pvs=74",
      },
    ],
  },
  14: {
    // UP 1-4 · 동물 인터뷰
    links: [
      {
        label: "동물 인터뷰",
        url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step1-e43ab89ffa78832db517812dbbf43122",
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
    links: [
      {
        label: "인트로영상 만들기",
        url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step3-362ab89ffa788077b2d6e610378d1708",
      },
    ],
  },
  6: {
    // PRO 1 · 시네마틱 5컷 다이얼로그
    links: [],
  },
  8: {
    // PRO 4 · AI 그림책 만들기
    links: [],
  },
  4: {
    // MASTER 1 · 광고영상 만들기
    links: [],
  },
  3: {
    // MASTER 2 · 프리프로덕션
    links: [],
  },
};

// Steps shown in mypage, in display order. UI iterates this list.
// ZERO → UP (1, 2, 21) → PRO 1 (6) → MASTER 1·2 (4, 3).
// PRO 2 (5, 유튜브 창작과정) / PRO 3 (7, 멀티영상) 은 자료가 비어 있어 제외.
export const MYPAGE_STEP_ORDER = [100, 1, 2, 21, 6, 4, 3];

// (classType, stepLevel) on ClassSession → STEP_MATERIALS key
// UP 1 sub-variants 가 각자의 자료를 갖도록 1:1 매핑 (UP_1 은 legacy/혼합).
// PRO 슬롯 재배치: 1=시네마틱(6), 2=유튜브 창작과정(5), 3=멀티영상(7), 4=AI 그림책(8).
// MASTER 슬롯: 1=광고영상(4), 2=프리프로덕션(3).
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
  PRO_2: 5,
  PRO_3: 7,
  PRO_4: 8,
  MASTER_1: 4,
  MASTER_2: 3,
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
