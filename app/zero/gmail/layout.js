import { requireStepAccess } from "@/lib/access";

export default async function ZeroGmailLayout({ children }) {
  await requireStepAccess(100);
  return children;
}
