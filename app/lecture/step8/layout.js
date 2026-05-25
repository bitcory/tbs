import { requireStepAccess } from "@/lib/access";

export default async function Step8Layout({ children }) {
  await requireStepAccess(8);
  return children;
}
