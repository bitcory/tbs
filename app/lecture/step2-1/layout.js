import { requireStepAccess } from "@/lib/access";

export default async function Step2_1Layout({ children }) {
  await requireStepAccess(21);
  return children;
}
