import { requireStepAccess } from "@/lib/access";

export default async function Step6Layout({ children }) {
  await requireStepAccess(6);
  return children;
}
