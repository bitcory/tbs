import { requireStepAccess } from "@/lib/access";

export default async function Step5Layout({ children }) {
  await requireStepAccess(5);
  return children;
}
