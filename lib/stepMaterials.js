// 단계별 강의자료 Notion 링크 설정 파일
//
// 각 단계의 links 배열에 { label, url } 형태로 추가하세요.
// - label: 이메일과 버튼에 보일 이름 (예: "Part 1", "실습 자료")
// - url: Notion 공유 링크 (tracking 쿼리 ?source=copy_link 는 빼도 됨)
//
// links 배열이 비어 있으면 버튼이 "준비중"으로 비활성화됩니다.

import { stepLabel, stepCourseTitle } from "./stepLabel";

export const STEP_MATERIALS = {
  1: {
    links: [
      {
        label: "Part 2",
        url: "https://www.notion.so/ToolB-1-Part2_-32eab89ffa78800f9dd0f05315db4f47",
      },
    ],
  },
  2: {
    links: [
      {
        label: "Part 1",
        url: "https://www.notion.so/ToolB-2-Part1-700ab89ffa7882eab73c0185db9430d4",
      },
      {
        label: "Part 2",
        url: "https://www.notion.so/ToolB-2-Part2-338ab89ffa78800b9f0fdf1a07cfdc4c",
      },
    ],
  },
  3: {
    links: [
      // 예: { label: "Part 1", url: "https://www.notion.so/..." },
    ],
  },
};

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
