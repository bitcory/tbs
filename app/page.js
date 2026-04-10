/**
 * Home page — renders the study lab bento layout (main.html) full-screen.
 *
 * The main.html is a standalone HTML file in /public/toolblab/ that contains
 * the 3×3 step grid, access code modal, and all interactions. Loading it via
 * iframe preserves all original behavior (access codes 0410 / 0411, step
 * buttons with target="_top" navigating this window, etc.).
 */
export default function Home() {
  return (
    <main className="fixed inset-0 w-screen h-screen bg-[#050505] overflow-hidden">
      <iframe
        src="/toolblab/main.html"
        title="TB STUDY"
        className="w-full h-full border-0 block"
      />
    </main>
  );
}
