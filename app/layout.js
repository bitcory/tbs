import localFont from "next/font/local";
import "./globals.css";

const paperlogy = localFont({
  src: [
    { path: "./fonts/Paperlogy-1Thin.woff", weight: "100", style: "normal" },
    { path: "./fonts/Paperlogy-2ExtraLight.woff", weight: "200", style: "normal" },
    { path: "./fonts/Paperlogy-3Light.woff", weight: "300", style: "normal" },
    { path: "./fonts/Paperlogy-4Regular.woff", weight: "400", style: "normal" },
    { path: "./fonts/Paperlogy-5Medium.woff", weight: "500", style: "normal" },
    { path: "./fonts/Paperlogy-6SemiBold.woff", weight: "600", style: "normal" },
    { path: "./fonts/Paperlogy-7Bold.woff", weight: "700", style: "normal" },
    { path: "./fonts/Paperlogy-8ExtraBold.woff", weight: "800", style: "normal" },
    { path: "./fonts/Paperlogy-9Black.woff", weight: "900", style: "normal" },
  ],
  variable: "--font-paperlogy",
});

// ─── Site constants ─────────────────────────────────────
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tbs.aitoolb.com';
const SITE_NAME = 'TB STUDY';
const SITE_TITLE = 'TB STUDY - AI 영상 제작 학습실';
const SITE_DESCRIPTION =
  'AI 영상 제작 5단계 커리큘럼 학습실. 마스터 이미지, 1분 영상, 인트로, 광고, 유튜브 수익화까지 단계별 강의를 만나보세요.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'TB STUDY',
    'TBPLUS',
    'TOOLB LAB',
    'AI 영상 제작',
    'AI 영상 강의',
    'AI 이미지 생성',
    '1분 영상 만들기',
    '유튜브 수익화',
    '인트로 영상 제작',
    '광고 영상 제작',
  ],
  authors: [{ name: 'TOOLB LAB', url: SITE_URL }],
  creator: 'TOOLB LAB',
  publisher: 'TOOLB LAB',
  category: 'education',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/images/favicon_io/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/images/favicon_io/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/images/favicon_io/favicon.ico?v=2', sizes: 'any' },
    ],
    apple: [
      { url: '/images/favicon_io/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/images/meta/og-image.png',
        width: 1870,
        height: 982,
        alt: 'TB STUDY - AI 영상 제작 학습실',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/images/meta/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#050505',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning className={`${paperlogy.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
