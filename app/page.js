import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as S from "@/lib/uiStyles";

export default async function Home() {
  const session = await auth();
  let me = null;
  if (session?.user) {
    me = await prisma.user.findUnique({ where: { id: session.user.id } });
  }

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
        src="/toolblab/main.html"
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
