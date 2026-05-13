import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import nodemailer from "nodemailer";

const BRAND_GREEN = "#016837";
const BRAND_GREEN_LIGHT = "#00B380";
const SITE_URL = "https://tbs.aitoolb.com";

const nickname = "민스";
const stepLabelText = "UP 1-2";
const courseTitle = "춤추는 영상 프롬프트";
const title = `${stepLabelText} · ${courseTitle}`;
const links = [
  {
    label: "말하는 영상",
    url: "https://voracious-crustacean-eeb.notion.site/TB-UP-CLASS-Step1-34dab89ffa7880cba66fd862c3f76c5d",
  },
];

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

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>AI툴비 ${stepLabelText} 강의자료</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_GREEN} 0%,#00996D 45%,${BRAND_GREEN_LIGHT} 100%);padding:48px 32px 40px;text-align:center;color:#ffffff;">
              <div style="display:inline-block;font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;padding:8px 16px;border:1px solid rgba(255,255,255,0.35);border-radius:100px;background:rgba(255,255,255,0.1);margin-bottom:16px;">
                AI TOOLB · ${stepLabelText} · TEST
              </div>
              <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;line-height:1.3;letter-spacing:-0.01em;">
                강의자료가 도착했어요 ✨
              </h1>
              <p style="margin:0;font-size:14px;line-height:1.7;opacity:0.92;">
                ${title}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 16px;">
              <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#0f172a;">
                ${nickname}님, 안녕하세요 👋
              </p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.75;color:#334155;">
                <b>AI툴비(ToolB)</b> 메일 발송 테스트입니다.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.75;color:#334155;">
                아래 버튼을 눌러 <b>${stepLabelText}</b> 강의자료를 확인하실 수 있어요.<br/>
                Notion 페이지로 연결되며, 언제든 다시 열어보실 수 있습니다.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${linkButtons}
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                <tr>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px 18px;">
                    <div style="font-size:12px;font-weight:800;color:${BRAND_GREEN};letter-spacing:0.04em;margin-bottom:6px;">💡 TEST</div>
                    <div style="font-size:13px;line-height:1.7;color:#166534;">
                      이 메일은 운영진(민스)에게 보내는 발송 테스트입니다.<br/>
                      UP 1-2 (춤추는) 단계가 말하는 영상 자료 URL 로 정상 발송되는지 확인용입니다.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              <div style="height:1px;background:#e2e8f0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 36px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.7;">
              <div style="font-weight:700;color:#334155;font-size:13px;margin-bottom:6px;">AI툴비 · ToolB</div>
              <div>영상 제작이 처음인 분들도 쉽게 시작할 수 있도록.</div>
              <div style="margin-top:14px;">
                <a href="${SITE_URL}" style="color:${BRAND_GREEN};text-decoration:none;font-weight:600;">tbs.aitoolb.com</a>
              </div>
              <div style="margin-top:16px;font-size:11px;color:#cbd5e1;">
                본 메일은 발송 시스템 점검을 위한 테스트 메일입니다.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const text = `${nickname}님, 안녕하세요.

AI툴비(ToolB) 메일 발송 테스트입니다.
${title}

${links.map((l) => `- ${l.label}: ${l.url}`).join("\n")}

— AI툴비
${SITE_URL}
`;

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
if (!user || !pass) {
  console.error("환경변수 누락: GMAIL_USER / GMAIL_APP_PASSWORD");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
});

const info = await transporter.sendMail({
  from: `"AI툴비 · ToolB" <${user}>`,
  to: "taegi0913@naver.com",
  subject: `[AI툴비][TEST] ${stepLabelText} 강의자료 발송 테스트 📘`,
  text,
  html,
});

console.log("OK:", info.messageId, "→ taegi0913@naver.com");
