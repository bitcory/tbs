import ZeroPost from '../ZeroPost';

export const metadata = {
  title: '캡컷(CapCut) 설치하기 | ZERO CLASS',
  description: '캡컷 PRO 구버전 무료로 사용하는 설치 방법과 꿀팁. Google Drive 다운로드 링크 포함.',
};

export default function Page() {
  return (
    <ZeroPost
      category="STEP 02 · 툴 설치"
      title="캡컷(CapCut) 설치하기 — PRO 구버전 꿀팁"
      subtitle="AI 영상 제작 실습을 위해 캡컷을 설치합니다. 학습 목적의 PRO 구버전 설치법까지 함께 안내합니다."
      readingTime="약 6분"
      thumbClass="gradient-capcut"
      thumbLabel="▶"
      sections={[
        {
          heading: '⚠️ 들어가기 전에',
          body: [
            '이 글에서 소개하는 구버전 캡컷 설치는 PRO 기능을 학습·체험하기 위한 용도입니다.',
            '지속적으로 사용하실 분들은 반드시 캡컷 공식 유료 구독을 이용해주세요.',
            '또한 캡컷이 업데이트되면 이 방법은 예고 없이 막힐 수 있습니다.',
          ],
        },
        {
          heading: '1단계. 기존 캡컷 삭제',
          body: [
            'PC에 기존 캡컷(CapCut)이 설치되어 있다면 먼저 깨끗하게 삭제합니다.',
            '윈도우: 제어판 → 프로그램 추가/제거 → CapCut 제거',
            'Mac: 응용 프로그램 폴더에서 CapCut을 휴지통으로 이동',
          ],
        },
        {
          heading: '2단계. 구버전 설치 파일 다운로드',
          body: [
            '아래 Google Drive 링크에서 본인 OS(Mac / Windows)에 맞는 설치 파일을 받습니다.',
          ],
          links: [
            {
              label: '캡컷 구버전 다운로드 (Google Drive)',
              href: 'https://drive.google.com/drive/folders/1hJNp_Itv2ZHM7Bu8FW7G06l72_lVv6_J?usp=drive_link',
            },
          ],
        },
        {
          heading: '3단계. 설치 및 실행',
          body: [
            '다운로드한 파일을 실행하여 캡컷을 설치합니다.',
            '설치가 완료되면 캡컷을 실행하고 구글 계정 또는 TikTok 계정으로 로그인합니다.',
            '자동 업데이트 알림이 뜨더라도 업데이트하지 마세요. 업데이트 시 구버전 혜택이 사라질 수 있습니다.',
          ],
        },
        {
          heading: '4단계. PRO 기능 사용 팁',
          body: [
            '평소처럼 영상을 편집하다가 PRO 기능(유료 효과·AI 기능)을 적용해 보세요.',
            '캡컷은 PRO 기능 적용 시 미리 처리된 임시 파일을 아래 경로에 저장합니다.',
            '이 임시 파일을 찾아서 활용하는 것이 오늘의 핵심 꿀팁입니다.',
          ],
        },
        {
          heading: '📁 임시 파일 저장 경로',
          body: [
            'Mac: /Users/[사용자이름]/Movies/CapCut/User Data/Projects/com.lveditor.draft/[날짜폴더]/Resources/combination',
            'Windows: \\Videos\\CapCut\\User Data\\Projects\\com.lveditor.draft\\',
            '해당 폴더를 열어 "수정한 날짜" 기준으로 정렬하면 방금 작업한 프로젝트 폴더를 쉽게 찾을 수 있습니다.',
          ],
        },
        {
          heading: '🎬 준비 완료',
          body: [
            '이제 캡컷으로 영상 편집을 시작할 준비가 끝났습니다.',
            '다음 UP CLASS 단계에서 실제 영상 제작을 따라해 보세요.',
          ],
        },
      ]}
      sourceUrl="https://aitoolb.com/61"
      sourceLabel="원문 블로그: AI툴비"
    />
  );
}
