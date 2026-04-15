import { requireStepAccess } from "@/lib/access";

export default async function Step3Layout({ children }) {
  await requireStepAccess(3);
  return children;
}
