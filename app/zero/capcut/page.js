import ZeroPost from '../ZeroPost';

export const metadata = {
  title: '무료 캡컷 다운로드 | ZERO CLASS',
  description: '캡컷 PRO 구버전을 무료로 설치하고 체험하는 방법. Google Drive 다운로드 링크 포함.',
};

export default function Page() {
  return (
    <ZeroPost
      category="STEP 02 · 툴 설치"
      title="캡컷(CapCut) PRO 구버전 무료사용 꿀팁"
      subtitle="유료 PRO 기능을 체험하고 학습하기 위한 캡컷 구버전 설치 방법을 안내합니다."
      readingTime="약 6분"
      thumbImage="/images/classimg/zero_02.png"
      sections={[
        {
          heading: '⚠️ 중요 안내사항',
          body: [
            '이 방법은 캡컷의 기능을 "체험"하고 "학습"하기 위한 목적으로 공유됩니다.',
            '지속적이고 안정적인 사용을 위해서는 정식 유료 버전 구독을 강력히 권장합니다.',
            '캡컷 업데이트 시 언제든 예고 없이 작동하지 않을 수 있습니다.',
          ],
        },
        {
          heading: '1단계. 준비물 챙기기 (구버전 캡컷 설치)',
          body: [
            'PC에 설치된 기존 캡컷을 완전히 삭제합니다.',
            '아래 Google Drive 링크에서 본인 OS(Mac / Windows)에 맞는 구버전 설치 파일을 다운로드하고 설치합니다.',
          ],
          links: [
            {
              label: '캡컷 구버전 다운로드 (Google Drive)',
              href: 'https://drive.google.com/drive/folders/1hJNp_Itv2ZHM7Bu8FW7G06l72_lVv6_J?usp=drive_link',
            },
          ],
        },
        {
          heading: '2단계. PRO 기능 마음껏 적용해 보기',
          body: [
            '캡컷을 실행한 후 영상을 편집합니다.',
            'PRO 마크가 붙은 유료 기능(효과, 필터, 텍스트 애니메이션 등)을 자유롭게 적용해 보세요.',
            '캡컷이 자동으로 사전 처리(combination)하여 임시 폴더에 저장합니다.',
          ],
        },
        {
          heading: '📁 핵심 파일 저장 경로',
          body: [
            <span key="mac"><strong style={{ color: '#DC2626' }}>Mac:</strong>{' '}<code style={{ color: '#DC2626', background: '#FEF2F2', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>/Users/toolb/Movies/CapCut/User Data/Projects/com.lveditor.draft/Resources/combination</code></span>,
            <span key="win"><strong style={{ color: '#2563EB' }}>Windows:</strong>{' '}<code style={{ color: '#2563EB', background: '#EFF6FF', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>c:/toolb &gt; appdata &gt; CapCut &gt; User Data &gt; Projects &gt; com.lveditor.draft &gt; [폴더명]</code></span>,
            '💡 팁: 파일 탐색기에서 "수정한 날짜"로 정렬하면 방금 작업한 폴더를 쉽게 찾을 수 있습니다.',
            'combination 폴더 안의 파일이 바로 PRO 유료 기능이 적용된 영상 클립 원본입니다.',
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
