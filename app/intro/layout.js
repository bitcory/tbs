import { Kaushan_Script } from "next/font/google";

const kaushan = Kaushan_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-kaushan",
  display: "swap",
});

export const metadata = {
  title: "TB STUDY LAB · 인트로",
  description: "TB STUDY LAB — 영상제작의 지침을 드립니다.",
  robots: { index: false, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#02110b",
  colorScheme: "dark",
};

export default function IntroLayout({ children }) {
  return <div className={kaushan.variable}>{children}</div>;
}
