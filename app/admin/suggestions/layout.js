import { requireSuggestionViewer } from "@/lib/access";

export default async function AdminSuggestionsLayout({ children }) {
  await requireSuggestionViewer();
  return children;
}
