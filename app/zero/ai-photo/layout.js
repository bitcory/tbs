import { requireStepAccess } from "@/lib/access";

export default async function ZeroAiPhotoLayout({ children }) {
  await requireStepAccess(100);
  return children;
}
