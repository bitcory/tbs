import nodemailer from "nodemailer";
import { getStepMaterials } from "./stepMaterials";

const BRAND_GREEN = "#016837";
const BRAND_GREEN_LIGHT = "#00B380";
const SITE_URL = "https://tbs.aitoolb.com";

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) {
    throw new Error(
      "이메일 발송 설정 누락: GMAIL_USER / GMAIL_APP_PASSWORD 환경변수를 확인하세요."
    );
  }
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

function buildHtml({ nickname, step, title, links }) {
  const linkButtons = links
    .map(
      (l) => `
        <tr>
          <td style="padding:8px 0;">
            <a href="${l.url}"
               style="display:block;padding:16px 24px;background:linear-gradient(135deg,${BRAND_GREEN} 0%,${BRAND_GREEN_LIGHT} 100%);color:#ffffff;text-decoration:none;border-radius:14px;font-weight:700;font-size:15px;text-align:center;letter-spacing:-0.01em;box-shadow:0 8px 18px rgba(0,153,109,0.28);">
              📘 ${l.label} 자료 열기
            </a>
          </td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>AI툴비 UP ${step} 강의자료</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,0.1);">

          <!-- Hero -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_GREEN} 0%,#00996D 45%,${BRAND_GREEN_LIGHT} 100%);padding:48px 32px 40px;text-align:center;color:#ffffff;">
              <div style="display:inline-block;font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;padding:8px 16px;border:1px solid rgba(255,255,255,0.35);border-radius:100px;background:rgba(255,255,255,0.1);margin-bottom:16px;">
                AI TOOLB · UP ${step}
              </div>
              <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;line-height:1.3;letter-spacing:-0.01em;">
                강의자료가 도착했어요 ✨
              </h1>
              <p style="margin:0;font-size:14px;line-height:1.7;opacity:0.92;">
                ${title}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 16px;">
              <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#0f172a;">
                ${nickname}님, 안녕하세요 👋
              </p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.75;color:#334155;">
                <b>AI툴비(ToolB)</b> 강의를 수강해 주셔서 진심으로 감사합니다.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.75;color:#334155;">
                아래 버튼을 눌러 <b>UP ${step}</b> 강의자료를 확인하실 수 있어요.<br/>
                Notion 페이지로 연결되며, 언제든 다시 열어보실 수 있습니다.
              </p>

              <!-- Links -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${linkButtons}
              </table>

              <!-- Tip box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                <tr>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px 18px;">
                    <div style="font-size:12px;font-weight:800;color:${BRAND_GREEN};letter-spacing:0.04em;margin-bottom:6px;">💡 TIP</div>
                    <div style="font-size:13px;line-height:1.7;color:#166534;">
                      이 메일을 즐겨찾기에 추가하거나 별도 폴더로 분류해 두시면<br/>
                      필요할 때마다 빠르게 자료를 꺼내 보실 수 있어요.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:16px 32px 0;">
              <div style="height:1px;background:#e2e8f0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 36px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.7;">
              <div style="font-weight:700;color:#334155;font-size:13px;margin-bottom:6px;">AI툴비 · ToolB</div>
              <div>영상 제작이 처음인 분들도 쉽게 시작할 수 있도록.</div>
              <div style="margin-top:14px;">
                <a href="${SITE_URL}" style="color:${BRAND_GREEN};text-decoration:none;font-weight:600;">tbs.aitoolb.com</a>
              </div>
              <div style="margin-top:16px;font-size:11px;color:#cbd5e1;">
                본 메일은 마이페이지에서 직접 신청하신 회원님께 발송되었습니다.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText({ nickname, step, title, links }) {
  const lines = links.map((l) => `- ${l.label}: ${l.url}`).join("\n");
  return `${nickname}님, 안녕하세요.

AI툴비(ToolB) 강의를 수강해 주셔서 감사합니다.
아래 링크에서 UP ${step} 강의자료를 확인하실 수 있습니다.

${title}

${lines}

— AI툴비
${SITE_URL}
`;
}

export async function sendMaterialsEmail({ to, nickname, step }) {
  const materials = getStepMaterials(step);
  if (!materials || materials.links.length === 0) {
    throw new Error(`UP ${step} 자료가 아직 등록되지 않았습니다.`);
  }
  const transporter = getTransporter();
  const from = `"AI툴비 · ToolB" <${process.env.GMAIL_USER}>`;
  const subject = `[AI툴비] UP ${step} 강의자료를 보내드립니다 📘`;
  const payload = { nickname, step, title: materials.title, links: materials.links };

  await transporter.sendMail({
    from,
    to,
    subject,
    text: buildText(payload),
    html: buildHtml(payload),
  });
}
