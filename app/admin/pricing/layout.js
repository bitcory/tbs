import { requireSuperAdmin } from "@/lib/access";

export default async function PricingLayout({ children }) {
  await requireSuperAdmin();
  return children;
}
