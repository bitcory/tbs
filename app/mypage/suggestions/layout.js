import { requireUser } from "@/lib/access";

export default async function SuggestionsLayout({ children }) {
  await requireUser();
  return children;
}
