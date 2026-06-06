import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CapCutSRT 데스크톱 앱 인증 엔드포인트.
// 앱이 매 실행 시 연결코드(token)를 보내 사용 가능 여부를 확인한다.
//
//   POST /api/desktop/verify   body: { "token": "CAPS-XXXX-XXXX-XXXX-XXXX" }
//   →  { allowed: true,  nickname, name }
//   →  { allowed: false, reason: "invalid" | "no_access" }
//
// 권한 규칙: 연결코드가 유효하고(revoked 아님), 그 사용자가
// capsrtAccess=true 이거나 운영진/슈퍼관리자면 허용.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function verify(token) {
  if (!token || typeof token !== "string") {
    return { status: 400, body: { allowed: false, reason: "invalid" } };
  }

  const row = await prisma.desktopToken.findUnique({
    where: { token: token.trim() },
    include: {
      user: { select: { nickname: true, name: true, capsrtAccess: true, role: true } },
    },
  });

  if (!row || row.revoked || !row.user) {
    return { status: 200, body: { allowed: false, reason: "invalid" } };
  }

  const u = row.user;
  const allowed = u.capsrtAccess || u.role === "STAFF" || u.role === "SUPER_ADMIN";
  if (!allowed) {
    return { status: 200, body: { allowed: false, reason: "no_access" } };
  }

  // 마지막 사용 시각 기록 (실패해도 인증에는 영향 없음)
  prisma.desktopToken
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    status: 200,
    body: { allowed: true, nickname: u.nickname ?? null, name: u.name ?? null },
  };
}

export async function POST(req) {
  let token = null;
  try {
    const body = await req.json();
    token = body?.token ?? null;
  } catch {
    // JSON 파싱 실패 → invalid
  }
  const { status, body } = await verify(token);
  return NextResponse.json(body, { status });
}

// 편의용 GET (?token=...) — 일부 환경에서 POST 가 막힐 때 대비.
export async function GET(req) {
  const token = req.nextUrl.searchParams.get("token");
  const { status, body } = await verify(token);
  return NextResponse.json(body, { status });
}
