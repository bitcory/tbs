import { requireStepAccess } from "@/lib/access";

export default async function Step2Layout({ children }) {
  await requireStepAccess(2);
  return children;
}
