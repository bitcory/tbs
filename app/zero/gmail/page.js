import ZeroPost from '../ZeroPost';

export const metadata = {
  title: '구글 메일 만들기 | ZERO CLASS',
  description: 'AI 툴 가입과 유튜브 운영에 필수인 구글 계정을 만드는 방법.',
};

export default function Page() {
  return (
    <ZeroPost
      category="STEP 01 · 계정"
      title="구글 메일(Gmail) 만들기"
      subtitle="AI 툴 가입·유튜브 운영에 꼭 필요한 구글 계정을 만들어 봅시다."
      readingTime="약 5분"
      thumbClass="gradient-gmail"
      thumbLabel="M"
      sections={[
        {
          heading: '1. 구글 계정이 왜 필요한가요?',
          body: [
            '영상 제작 과정에서 사용하는 대부분의 AI 툴과 유튜브, 구글 드라이브 등은 구글 계정을 요구합니다.',
            '하나의 구글 계정만 있으면 여러 서비스를 한 번에 관리할 수 있어 효율적입니다.',
          ],
        },
        {
          heading: '2. 가입 페이지 접속',
          body: [
            '아래 버튼을 클릭해 구글 계정 가입 페이지로 바로 이동하세요.',
            '"계정 만들기 → 개인용"을 선택하시면 됩니다.',
          ],
          links: [
            { label: '구글 계정 만들기 바로가기', href: 'https://accounts.google.com/signup' },
          ],
        },
        {
          heading: '3. 기본 정보 입력',
          body: [
            '이름, 생년월일, 성별을 입력합니다.',
            '사용할 Gmail 주소를 만듭니다. 이미 사용 중인 주소라면 다른 주소를 추천해줍니다.',
            '비밀번호는 영문/숫자/기호를 섞어 8자 이상으로 설정하세요.',
          ],
        },
        {
          heading: '4. 휴대폰 인증',
          body: [
            '본인 명의의 휴대폰 번호로 인증코드를 받습니다.',
            '받은 코드를 입력하면 계정 보안이 강화됩니다.',
          ],
        },
        {
          heading: '5. 가입 완료',
          body: [
            '개인정보 보호 및 약관에 동의하면 가입이 완료됩니다.',
            '이제 만든 Gmail 주소로 유튜브, AI 툴 등 다양한 서비스에 로그인할 수 있습니다.',
          ],
        },
      ]}
    />
  );
}
