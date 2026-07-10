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
    // UP 1 · AI영상기초다지기 (말하는 영상 통합)
    links: [
      {
        label: "AI영상기초다지기",
        url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step1-34dab89ffa7880cba66fd862c3f76c5d",
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
  7: {
    // PRO 3 · 멀티영상 만들기
    links: [
      {
        label: "멀티영상 만들기",
        url: "https://www.notion.so/TB-PRO-3-369ab89ffa7880fd8210d8aff055e8cc?pvs=11",
      },
    ],
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
// ZERO → UP (1, 2, 21) → PRO 1 (6) → PRO 3 (7) → MASTER 1·2 (4, 3).
// PRO 2 (5, 뮤직영상 마스터) 는 자료가 비어 있어 제외.
export const MYPAGE_STEP_ORDER = [100, 1, 2, 21, 6, 7, 4, 3];

// (classType, stepLevel) on ClassSession → STEP_MATERIALS key
// UP 1 은 단일 과정(AI영상기초다지기)으로 통합.
// PRO 슬롯 재배치: 1=시네마틱(6), 2=뮤직영상 마스터(5), 3=멀티영상(7), 4=AI 그림책(8).
// MASTER 슬롯: 1=광고영상(4), 2=프리프로덕션(3).
const SESSION_TO_MATERIAL_STEP = {
  ZERO_0: 100,
  UP_1: 1,
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
