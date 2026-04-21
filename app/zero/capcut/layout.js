import { requireStepAccess } from "@/lib/access";

export default async function ZeroCapcutLayout({ children }) {
  await requireStepAccess(100);
  return children;
}
