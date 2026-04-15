import { requireStepAccess } from "@/lib/access";

export default async function Step1Layout({ children }) {
  await requireStepAccess(1);
  return children;
}
