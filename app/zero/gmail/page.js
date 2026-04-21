import ZeroPost from '../ZeroPost';

export const metadata = {
  title: '구글 메일 만들기 | ZERO CLASS',
  description: 'AI 툴 가입과 유튜브 운영에 필수인 구글 계정을 만드는 방법.',
};

export default function Page() {
  return (
    <ZeroPost
      stepId="zero-gmail"
      category="STEP 01 · 계정"
      title="구글 메일(Gmail) 만들기"
      subtitle="AI 툴 가입·유튜브 운영에 꼭 필요한 구글 계정을 만들어 봅시다."
      readingTime="약 5분"
      thumbImage="/images/classimg/zero_01.png"
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
          images: [
            { src: '/images/zero/gmail/1.png', alt: '구글 로그인 - 계정 만들기 클릭 후 개인용 선택' },
          ],
        },
        {
          heading: '3. 기본 정보 입력',
          body: [
            '이름(성, 이름)을 입력합니다.',
            '생년월일과 성별을 입력합니다.',
          ],
          images: [
            { src: '/images/zero/gmail/3.png', alt: '생년월일과 성별 입력' },
          ],
        },
        {
          heading: '4. Gmail 주소 만들기',
          body: [
            '"내 Gmail 주소 만들기"를 선택하면 원하는 주소를 직접 입력할 수 있습니다.',
            '이미 사용 중인 주소라면 다른 주소를 추천해줍니다.',
          ],
          images: [
            { src: '/images/zero/gmail/4.png', alt: '내 Gmail 주소 만들기 선택' },
            { src: '/images/zero/gmail/5.png', alt: 'Gmail 주소 직접 입력' },
          ],
        },
        {
          heading: '5. 비밀번호 설정',
          body: [
            '비밀번호는 문자, 숫자, 기호를 조합하여 안전하게 만드세요.',
            '비밀번호와 확인을 동일하게 입력합니다.',
          ],
          images: [
            { src: '/images/zero/gmail/6.png', alt: '비밀번호 만들기' },
          ],
        },
        {
          heading: '6. 복구 이메일 & 전화번호',
          body: [
            '복구 이메일과 전화번호는 선택사항입니다.',
            '나중에 설정할 수 있으니 "건너뛰기"를 눌러도 됩니다.',
          ],
          images: [
            { src: '/images/zero/gmail/7.png', alt: '복구 이메일 추가 - 건너뛰기' },
            { src: '/images/zero/gmail/8.png', alt: '전화번호 추가 - 건너뛰기' },
          ],
        },
        {
          heading: '7. 약관 동의 & 가입 완료',
          body: [
            '개인정보 보호 및 약관 내용을 확인합니다.',
            'Google 서비스 약관과 개인정보처리방침에 동의한 후 "계정 만들기" 버튼을 누르면 가입이 완료됩니다.',
            '이제 만든 Gmail 주소로 유튜브, AI 툴 등 다양한 서비스에 로그인할 수 있습니다.',
          ],
          images: [
            { src: '/images/zero/gmail/9.png', alt: '개인 정보 보호 및 약관' },
            { src: '/images/zero/gmail/10.png', alt: '약관 동의 후 계정 만들기' },
          ],
        },
      ]}
    />
  );
}
