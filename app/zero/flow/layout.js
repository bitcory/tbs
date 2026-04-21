import { requireStepAccess } from "@/lib/access";

export default async function ZeroFlowLayout({ children }) {
  await requireStepAccess(100);
  return children;
}
