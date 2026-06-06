// Gallery media, grouped by class → step.
// NOTE: This mirrors STEP_MEDIA/STEPS in public/toolblab/main.html. When you add
// or change a step's preview media there, update the matching entry here too.

export const GALLERY = [
  {
    cls: "zero",
    label: "ZERO CLASS",
    accent: "#f97316",
    steps: [],
  },
  {
    cls: "up",
    label: "UP CLASS",
    accent: "#f97316",
    steps: [
      {
        step: "step1",
        label: "UP 1단계",
        title: "영상기초다지기",
        media: [
          { type: "image", src: "/images/step1/character-sheet.png", alt: "캐릭터 시트" },
          { type: "image", src: "/images/step1/sample-2.png", alt: "컨셉 시안" },
          { type: "image", src: "/images/step1/sample-1.png", alt: "작업물 샘플" },
          { type: "image", src: "/images/step1/master.png", alt: "마스터 이미지" },
        ],
      },
      {
        step: "step2",
        label: "UP 2단계",
        title: "뮤직영상 만들기",
        media: [
          { type: "video", src: "https://www.dropbox.com/scl/fi/yuu422j08cwsdb4f9dtbn/ED334F8B-B0CF-4A63-8B30-1B298765E6AC_video.MP4?rlkey=7qjv80w77a6qnhmmx2hxzyzxn&st=5m4j3mh2&raw=1", poster: "/images/thumbs/step2-1.jpg" },
          { type: "video", src: "https://www.dropbox.com/scl/fi/sprxx6bx1n1fax0osnpu0/.mp4?rlkey=bzvwjmb02j0v40i7ju90y3axd&st=pz8x7xn2&raw=1", poster: "/images/thumbs/step2-2.jpg" },
        ],
      },
      {
        step: "step2-1",
        label: "UP 3단계",
        title: "인트로영상 만들기",
        media: [
          { type: "video", src: "https://www.dropbox.com/scl/fi/zoxv7mrxgiykvycw98uzr/64FD93FB-9842-4116-A7CE-B6B6A26F6619_video.MP4?rlkey=4y5km1fa7slcw9vr8sdcqxsf5&st=wnlnkl49&raw=1", poster: "/images/thumbs/step3-1.jpg" },
          { type: "video", src: "https://www.dropbox.com/scl/fi/rgzsn6qqbz0cmwf0hhh8a/2.mp4?rlkey=cjpdtlfg0m05ta2v0hts68bov&st=n7oqdozj&raw=1", poster: "/images/thumbs/step3-2.jpg" },
        ],
      },
    ],
  },
  {
    cls: "pro",
    label: "PRO CLASS",
    accent: "#fb923c",
    steps: [
      {
        step: "step5",
        label: "PRO 2단계",
        title: "뮤직영상 마스터",
        media: [
          { type: "youtube", src: "https://youtube.com/watch?v=67V8yjpUalo", title: "뮤직영상 마스터 미리보기" },
          { type: "youtube", src: "https://youtu.be/oPA5z1V9GFo?si=fLvG1b3E0xEoKbJb", title: "뮤직영상 마스터 미리보기 2" },
        ],
      },
      {
        step: "step7",
        label: "PRO 3단계",
        title: "멀티영상 만들기",
        media: [
          { type: "youtube", src: "https://www.youtube.com/watch?v=eNPjHBk4rEo", title: "멀티영상 샘플 1" },
          { type: "youtube", src: "https://youtube.com/watch?v=l5_1EEX750w", title: "멀티영상 샘플 2" },
          { type: "youtube", src: "https://youtube.com/watch?v=XUPgogriS-8", title: "멀티영상 샘플 3" },
          { type: "youtube", src: "https://youtu.be/Y-vxkk1Qi44?si=669D_0znSsbOK0Lv", title: "멀티영상 샘플 4" },
        ],
      },
      {
        step: "step8",
        label: "PRO 4단계",
        title: "AI 그림책 만들기",
        media: [
          { type: "youtube", src: "https://youtu.be/9UfnUk7EvEU?si=-uktSftSwaF2SneK", title: "AI 그림책 샘플 1" },
          { type: "youtube", src: "https://youtu.be/3zUwMd8rKkI?si=7tzMJVcTN-eDFeGR", title: "AI 그림책 샘플 2" },
        ],
      },
    ],
  },
  {
    cls: "master",
    label: "MASTER CLASS",
    accent: "#fb7185",
    steps: [],
  },
];

// Extract the YouTube video id from watch?v=, youtu.be/, or embed URLs.
export function youtubeId(url) {
  if (!url) return null;
  const m =
    url.match(/[?&]v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?&/]+)/) ||
    url.match(/youtube\.com\/embed\/([^?&/]+)/);
  return m ? m[1] : null;
}
