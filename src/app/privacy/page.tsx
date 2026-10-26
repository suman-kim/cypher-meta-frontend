/**
 * 개인정보처리방침 페이지(/privacy).
 * 서비스가 실제로 수집하는 정보(방문 기록 visits·익명 쿠키 cy_vid·게시글/댓글)와
 * 광고(Google 애드센스) 쿠키, 위탁·국외 이전, 이용자 권리, 보호책임자를 안내한다.
 * 수집 항목이나 호스팅이 바뀌면 이 파일의 조항과 HOSTING 상수를 함께 고친다.
 */
import { BUSINESS } from "@/lib/business";
import { SITE_NAME } from "@/lib/constants";
import LegalDocument, { LegalLink, type LegalArticle } from "@/components/legal/LegalDocument";

export const metadata = {
  title: "개인정보처리방침",
  description: `${SITE_NAME} 개인정보처리방침 — 수집 항목, 보유 기간, 광고 쿠키, 이용자 권리와 문의처 안내.`,
  alternates: { canonical: "/privacy" },
};

/** 시행일 (방침을 고치면 함께 바꿉니다) */
const EFFECTIVE_DATE = "2026년 10월 26일";

/** 서버·DB 호스팅(처리 위탁·국외 이전 대상) */
const HOSTING = {
  name: "Railway Corporation",
  country: "미국",
  task: "웹 서비스·데이터베이스 서버 운영(클라우드 호스팅)",
};

const ARTICLES: LegalArticle[] = [
  {
    code: "제1조",
    num: "01",
    title: "개인정보의 처리 목적",
    items: [
      {
        text: `${SITE_NAME}(이하 "서비스")는 다음 목적에 필요한 최소한의 개인정보만 처리하며, 목적이 바뀌면 미리 알리고 필요한 동의를 받습니다.`,
        sub: [
          "서비스 제공: 전적 검색·통계, 커뮤니티 게시판·댓글, 이용자 투표",
          "서비스 운영: 방문 통계 분석, 오류 확인과 품질 개선",
          "부정 이용 방지: 중복 투표·도배·부적절한 게시물 대응",
          "광고 게재: 광고 노출과 성과 측정(제6조)",
        ],
      },
    ],
  },
  {
    code: "제2조",
    num: "02",
    title: "처리하는 개인정보 항목",
    items: [
      { text: "서비스는 회원가입이 없으며, 이름·전화번호·이메일 등 연락처를 수집하지 않습니다." },
      {
        text: "서비스를 이용하는 과정에서 다음 정보가 자동으로 생성·수집됩니다.",
        sub: [
          "접속 IP 주소와 이를 바탕으로 추정한 국가·도시",
          "브라우저·운영체제·기기 종류(User-Agent)",
          "방문한 페이지, 유입 경로(referrer), 검색어, 방문 일시",
          "방문자를 구분하기 위한 익명 식별 쿠키(cy_vid)",
        ],
      },
      {
        text: "커뮤니티·업데이트 노트에 글이나 댓글을 쓰면 다음 정보를 저장합니다.",
        sub: [
          "작성자가 입력한 닉네임, 제목·내용, 작성 일시",
          "삭제 확인용 비밀번호 — 원래 값으로 되돌릴 수 없는 단방향 암호화(해시) 형태로만 저장",
        ],
      },
      {
        text: "최근 검색어·화면 테마 같은 편의 설정은 이용자의 브라우저(로컬 저장소)에만 저장되며 서버로 전송되지 않습니다.",
      },
    ],
  },
  {
    code: "제3조",
    num: "03",
    title: "개인정보의 처리 및 보유 기간",
    items: [
      {
        text: "서비스는 아래 기간 동안만 개인정보를 보유하고, 기간이 지나거나 처리 목적을 달성하면 지체 없이 파기합니다.",
        sub: [
          "방문 기록(IP·기기 정보·방문 페이지 등): 수집일로부터 1년",
          "익명 식별 쿠키(cy_vid): 발급일로부터 1년(브라우저에서 언제든 삭제 가능)",
          "게시글·댓글과 닉네임·비밀번호(해시): 작성자가 삭제하거나 운영 정책에 따라 삭제될 때까지",
        ],
      },
      { text: "관계 법령에 따라 보존해야 하는 정보는 해당 법령이 정한 기간 동안 보관합니다." },
    ],
  },
  {
    code: "제4조",
    num: "04",
    title: "개인정보의 제3자 제공",
    items: [
      {
        text: "서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 이용자가 동의했거나 법령에 특별한 규정이 있는 경우는 예외로 합니다.",
      },
    ],
  },
  {
    code: "제5조",
    num: "05",
    title: "개인정보 처리의 위탁 및 국외 이전",
    items: [
      {
        text: "서비스는 안정적인 운영을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있으며, 서버가 국외에 있어 개인정보가 국외로 이전·보관됩니다.",
        sub: [
          `수탁자(이전받는 자): ${HOSTING.name} (${HOSTING.country})`,
          `위탁 업무: ${HOSTING.task}`,
          "이전 항목: 제2조의 방문 기록과 게시글·댓글 정보",
          "이전 시기·방법: 서비스 이용 시 네트워크를 통해 수시로 전송",
          "보유 기간: 제3조의 보유 기간과 같음",
        ],
      },
      {
        text: "국외 이전을 원하지 않으면 서비스 이용을 중단하거나 제7조의 방법으로 삭제를 요청할 수 있습니다. 이 경우 게시판 등 일부 기능을 이용할 수 없습니다.",
      },
    ],
  },
  {
    code: "제6조",
    num: "06",
    title: "광고 및 쿠키",
    items: [
      {
        text: "서비스는 Google 애드센스(Google AdSense) 광고를 게재할 수 있습니다. Google을 비롯한 제3자 광고 사업자는 쿠키를 사용해 이용자가 이 사이트와 다른 사이트를 방문한 기록을 바탕으로 맞춤 광고를 보여 줄 수 있습니다.",
      },
      {
        node: (
          <>
            Google이 광고 쿠키로 수집한 정보를 사용하는 방식은{" "}
            <LegalLink href="https://policies.google.com/technologies/partner-sites">
              Google 파트너 사이트 데이터 사용 안내
            </LegalLink>
            에서 확인할 수 있습니다.
          </>
        ),
      },
      {
        node: (
          <>
            맞춤 광고를 원하지 않으면 <LegalLink href="https://adssettings.google.com">Google 광고 설정</LegalLink>
            에서 끌 수 있고, 다른 광고 사업자의 맞춤 광고는{" "}
            <LegalLink href="https://www.aboutads.info/choices">www.aboutads.info</LegalLink>에서 거부할 수 있습니다.
          </>
        ),
      },
      {
        text: "브라우저 설정의 개인정보(쿠키) 메뉴에서 쿠키 저장을 거부하거나 저장된 쿠키를 삭제할 수 있습니다. 쿠키를 거부하면 맞춤형이 아닌 일반 광고가 표시되고, 투표 등 일부 기능이 제한될 수 있습니다.",
      },
    ],
  },
  {
    code: "제7조",
    num: "07",
    title: "정보주체의 권리와 행사 방법",
    items: [
      { text: "이용자는 언제든지 자신의 개인정보에 대해 열람·정정·삭제·처리정지를 요구할 수 있습니다." },
      {
        text: "게시글·댓글은 작성할 때 입력한 비밀번호로 직접 삭제할 수 있습니다. 비밀번호를 잊었거나 방문 기록 삭제를 원하면 제10조의 이메일로 요청해 주시면 지체 없이 처리합니다.",
      },
      {
        text: "방문 기록은 이름 등으로 개인을 직접 식별하지 않는 정보이므로, 요청할 때 해당 기록을 찾을 수 있는 정보(접속 일시·IP 주소 등)를 함께 알려 주셔야 합니다.",
      },
    ],
  },
  {
    code: "제8조",
    num: "08",
    title: "개인정보의 파기 절차 및 방법",
    items: [
      { text: "보유 기간이 지나거나 처리 목적을 달성한 개인정보는 지체 없이 파기합니다." },
      { text: "전자 파일 형태의 정보는 복구할 수 없는 방법으로 삭제하며, 종이 문서로 된 개인정보는 보관하지 않습니다." },
    ],
  },
  {
    code: "제9조",
    num: "09",
    title: "개인정보의 안전성 확보 조치",
    items: [
      {
        text: "서비스는 개인정보를 안전하게 처리하기 위해 다음 조치를 하고 있습니다.",
        sub: [
          "게시판 비밀번호는 단방향 암호화(해시)로 저장해 운영자도 원래 값을 알 수 없습니다.",
          "이용자 브라우저와 서버 사이의 통신은 HTTPS로 암호화합니다.",
          "관리자 기능은 별도 인증 토큰으로 접근을 제한하고, 개인정보를 다루는 사람을 운영자로 한정합니다.",
        ],
      },
    ],
  },
  {
    code: "제10조",
    num: "10",
    title: "개인정보 보호책임자",
    items: [
      {
        text: "서비스는 개인정보 처리에 관한 업무를 총괄하고, 관련 문의·불만·피해 구제를 처리하기 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.",
        sub: [
          `성명: ${BUSINESS.representative} (대표)`,
          `상호: ${BUSINESS.companyName}`,
          <>
            이메일: <LegalLink href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</LegalLink>
          </>,
        ],
      },
    ],
  },
  {
    code: "제11조",
    num: "11",
    title: "권익침해 구제 방법",
    items: [
      {
        text: "개인정보 침해에 대한 상담이나 분쟁 해결이 필요하면 아래 기관에 문의할 수 있습니다.",
        sub: [
          <>
            개인정보분쟁조정위원회: 1833-6972 (<LegalLink href="https://www.kopico.go.kr">www.kopico.go.kr</LegalLink>)
          </>,
          <>
            개인정보침해신고센터: (국번 없이) 118 (
            <LegalLink href="https://privacy.kisa.or.kr">privacy.kisa.or.kr</LegalLink>)
          </>,
          <>
            대검찰청 사이버수사과: (국번 없이) 1301 (<LegalLink href="https://www.spo.go.kr">www.spo.go.kr</LegalLink>)
          </>,
          <>
            경찰청 사이버수사국: (국번 없이) 182 (
            <LegalLink href="https://ecrm.police.go.kr">ecrm.police.go.kr</LegalLink>)
          </>,
        ],
      },
    ],
  },
  {
    code: "제12조",
    num: "12",
    title: "개인정보처리방침의 변경",
    items: [
      {
        text: "이 방침은 법령이나 서비스 변경에 따라 바뀔 수 있으며, 변경 내용은 시행 7일 전부터 서비스 내 공지로 알립니다.",
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      chip="PRIVACY POLICY"
      title="개인정보처리방침"
      description={`${SITE_NAME}가 어떤 정보를 왜 수집하고 얼마나 보관하는지, 이용자가 어떻게 권리를 행사할 수 있는지 안내합니다.`}
      effectiveDate={EFFECTIVE_DATE}
      articles={ARTICLES}
      noun="이 방침"
    />
  );
}
