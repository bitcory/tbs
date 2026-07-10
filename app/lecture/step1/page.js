import { requireStepAccess } from "@/lib/access";
import Step1Client from "./Step1Client";

// UP 1단계 · AI영상기초다지기 (말하는 영상 통합).
// 하위 변형(춤추는/날아가는/동물 인터뷰)은 폐지됐고, 접근은 단일 코드 1 로 통일.
export default async function Step1Page() {
  await requireStepAccess(1);
  return <Step1Client variant="talking" />;
}
