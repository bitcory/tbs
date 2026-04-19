import { requireStepAccess } from "@/lib/access";

export default async function Step4Layout({ children }) {
  await requireStepAccess(4);
  return children;
}
