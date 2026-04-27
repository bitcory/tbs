import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as S from "@/lib/uiStyles";

export default async function Home({ searchParams }) {
  // Pass class/step hints to the iframe so "back to home" restores the right section
  const sp = (await searchParams) ?? {};
  const qs = new URLSearchParams();
  if (typeof sp.c === "string") qs.set("c", sp.c);
  if (typeof sp.s === "string") qs.set("s", sp.s);

  // First-visit intro gate. Deep links (with c/s query) and explicit skip bypass.
  const isDeepLink = qs.toString().length > 0;
  const skipIntro = sp.skipIntro === "1";
  if (!isDeepLink && !skipIntro) {
    const cookieStore = await cookies();
    const seenIntro = cookieStore.get("tbs_intro_seen")?.value === "1";
    if (!seenIntro) redirect("/intro");
  }

  const session = await auth();
  let me = null;
  if (session?.user) {
    me = await prisma.user.findUnique({ where: { id: session.user.id } });
  }

  const iframeSrc = qs.toString()
    ? `/toolblab/main.html?${qs.toString()}`
    : "/toolblab/main.html";

  const avatarWrap = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: "50%",
    overflow: "hidden",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    textDecoration: "none",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.45)",
    backdropFilter: "blur(14px) saturate(140%)",
    WebkitBackdropFilter: "blur(14px) saturate(140%)",
    boxShadow:
      "0 6px 16px rgba(0,0,0,0.25), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.55), inset -1px -1px 0.5px 1px rgba(255,255,255,0.25)",
    transition: "transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2)",
  };

  const initial = (me?.nickname ?? me?.name ?? "?").slice(0, 1).toUpperCase();

  return (
    <main className="fixed inset-0 w-screen h-screen bg-[#050505] overflow-hidden">
      <iframe
        src={iframeSrc}
        title="TB STUDY"
        className="w-full h-full border-0 block"
      />
      <div style={{ position: "fixed", top: 16, right: 20, zIndex: 999 }}>
        {me ? (
          <Link href="/mypage" className="glass-hoverable" style={avatarWrap} title={me.nickname ?? ""}>
            {me.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.image}
                alt={me.nickname ?? "프로필"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span>{initial}</span>
            )}
          </Link>
        ) : (
          <Link href="/login" className="glass-hoverable" style={S.overlayPill}>
            로그인
          </Link>
        )}
      </div>
    </main>
  );
}
