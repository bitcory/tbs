import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();
  let me = null;
  if (session?.user) {
    me = await prisma.user.findUnique({ where: { id: session.user.id } });
  }

  const pill = {
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.25)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    background: "rgba(0,0,0,0.35)",
  };

  const avatarWrap = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: "50%",
    overflow: "hidden",
    border: "2px solid rgba(255,255,255,0.4)",
    background: "linear-gradient(135deg, #00996D 0%, #00B380 100%)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
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
          <Link href="/mypage" style={avatarWrap} title={me.nickname ?? ""}>
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
          <Link href="/login" style={pill}>
            로그인
          </Link>
        )}
      </div>
    </main>
  );
}
