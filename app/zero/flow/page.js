import ZeroPost from '../ZeroPost';

export const metadata = {
  title: 'FLOW 가입하기 | ZERO CLASS',
  description: 'AI 영상 제작 워크플로우 툴 FLOW에 가입하는 방법을 단계별로 안내합니다.',
};

export default function Page() {
  return (
    <ZeroPost
      stepId="zero-flow"
      category="STEP 02 · 계정"
      title="FLOW 가입하기"
      subtitle="AI 영상 제작 워크플로우 툴 FLOW에 가입하고 시작하는 방법을 안내합니다."
      readingTime="약 4분"
      thumbImage="/images/zero/flow/1.png"
      sections={[
        {
          heading: '1단계. FLOW 가입 페이지 접속',
          body: [
            '아래 버튼을 눌러 FLOW 사이트로 이동합니다.',
            '메인 화면에서 가입 또는 시작 버튼을 눌러 가입 절차를 시작하세요.',
          ],
          links: [
            { label: 'FLOW 바로가기', href: 'https://flow.google/' },
          ],
          images: [
            { src: '/images/zero/flow/intro.png', alt: 'FLOW 가입 시작 화면' },
          ],
        },
        {
          heading: '2단계. 구글 계정으로 로그인',
          body: [
            '앞서 만든 Gmail 주소로 로그인합니다.',
            '별도의 회원 가입 없이 구글 계정 한 번으로 바로 시작할 수 있습니다.',
          ],
          images: [
            { src: '/images/zero/flow/2.png', alt: '구글 계정으로 로그인' },
          ],
        },
        {
          heading: '3단계. 권한 동의 및 약관 확인',
          body: [
            'FLOW가 요청하는 기본 권한을 확인하고 동의합니다.',
            '이용 약관과 개인정보 처리방침을 읽은 뒤 동의 체크박스를 선택합니다.',
          ],
          images: [
            { src: '/images/zero/flow/3.png', alt: '권한 동의 및 약관 확인' },
          ],
        },
        {
          heading: '4단계. 가입 완료 & 대시보드 진입',
          body: [
            '가입이 완료되면 FLOW 대시보드로 이동합니다.',
            '이제 AI 영상 제작에 필요한 기능을 사용할 준비가 끝났습니다. 다음 단계로 넘어가 보세요.',
          ],
          images: [
            { src: '/images/zero/flow/4.png', alt: 'FLOW 대시보드' },
          ],
        },
      ]}
    />
  );
}
