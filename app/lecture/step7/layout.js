import { requireStepAccess } from "@/lib/access";

export default async function Step7Layout({ children }) {
  await requireStepAccess(7);
  return children;
}
