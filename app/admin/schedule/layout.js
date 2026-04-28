import { requireAdmin } from "@/lib/access";

export default async function ScheduleLayout({ children }) {
  await requireAdmin();
  return children;
}
