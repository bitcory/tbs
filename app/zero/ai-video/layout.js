import { requireStepAccess } from "@/lib/access";

export default async function ZeroAiVideoLayout({ children }) {
  await requireStepAccess(100);
  return children;
}
