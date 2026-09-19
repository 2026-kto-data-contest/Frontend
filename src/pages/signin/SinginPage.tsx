import { useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KakaoLoginButton } from "../../shared/components/KakaoLoginButton";
import { BackButton } from "../../shared/components/BackButton";
import { loginWithKakao } from "../../shared/api/api";
import loginBg from "../../assets/img/Login.png";
import { Header } from "../../shared/components/Header";

const ERROR_MESSAGES: Record<string, string> = {
  kakao_cancelled: "카카오 로그인을 취소했어요.",
  invalid_oauth_state: "로그인 요청이 만료됐어요. 다시 시도해주세요.",
  kakao_auth_failed: "카카오 로그인에 실패했어요. 다시 시도해주세요.",
};

export default function SinginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 로그인을 시작한 화면을 기억해뒀다가, 백엔드가 로그인·약관·온보딩을 모두 마친 뒤 그 화면으로 돌려보냅니다.
  const from = searchParams.get("from") || "/";
  const kakaoError = searchParams.get("error");
  const errorMessage = kakaoError
    ? ERROR_MESSAGES[kakaoError] || "로그인에 실패했어요. 다시 시도해주세요."
    : null;

  const [redirecting, setRedirecting] = useState(false);
  // 버튼을 연달아 누르면 로그인 시작 요청이 두 번 나가서, 백엔드가 두 번째 state로 덮어쓴
  // 쿠키와 먼저 도착한 요청의 카카오 인가 URL(state)이 서로 어긋나 로그인이 깨질 수 있습니다.
  const redirectingRef = useRef(false);

  const handleKakaoLogin = () => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    setRedirecting(true);
    loginWithKakao(from);
  };

  return (
    <PageContainer>
      {/* 이 화면 직전 브라우저 히스토리는 카카오 로그인 리다이렉트 체인(카카오 플랫폼→백엔드
          콜백)일 수 있어서, navigate(-1)을 쓰면 카카오 취소 후 뒤로가기가 다시 그 체인으로
          들어갈 수 있습니다. 그래서 항상 홈으로 보냅니다. */}
      <BackButton onClick={() => navigate("/")} onDark />

      <TopOverlay />
      <BottomOverlay />

      <TopContent>
        <Header onDark logoScale={1.4} />
        <Tagline>
          내 취향에 맞는 양조장부터
          <br />
          여행 코스까지 한 번에
        </Tagline>
      </TopContent>

      <BottomContent>
        {errorMessage && <ErrorText>{errorMessage}</ErrorText>}
        <Subtext>로그인하고 나만의 전통주 여행을 이어가세요</Subtext>
        <KakaoLoginButton onClick={handleKakaoLogin} disabled={redirecting}>
          카카오 로그인
        </KakaoLoginButton>
      </BottomContent>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px;
  box-sizing: border-box;
  overflow: hidden;
  color: #ffffff;
  background-image: url(${loginBg});
  background-size: cover;
  background-position: center;
`;

const TopOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
`;

const BottomOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.75) 100%);
  pointer-events: none;
`;

const TopContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 100px;
`;

const Tagline = styled.p`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
`;

const BottomContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
`;

const Subtext = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 200;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
`;

const ErrorText = styled.p`
  margin: 0;
  padding: 10px 14px;
  border-radius: 8px;
  background-color: rgba(239, 68, 68, 0.16);
  color: #fecaca;
  font-size: 0.8125rem;
  text-align: center;
`;
