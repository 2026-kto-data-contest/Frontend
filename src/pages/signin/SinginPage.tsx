import { useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KakaoLoginButton } from "../../shared/components/KakaoLoginButton";
import { BackButton } from "../../shared/components/BackButton";
import { startKakaoLogin, isKakaoConfigured } from "../../shared/lib/kakao";
import { useAuth } from "../../shared/lib/authContext";

export default function SinginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [isPending, setIsPending] = useState(false);
  // 로그인을 시작한 화면을 기억해뒀다가, 이미 온보딩까지 끝난 유저는 완료 즉시 그 화면으로 돌려보냅니다.
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";

  const goToNext = () => {
    if (auth.hasOnboarded) {
      navigate(from);
    } else {
      navigate(`/signin/terms?from=${encodeURIComponent(from)}`);
    }
  };

  const handleKakaoLogin = () => {
    if (isKakaoConfigured) {
      sessionStorage.setItem("kakao:from", from);
      try {
        startKakaoLogin();
      } catch (error) {
        console.error(error);
        alert("카카오 로그인에 실패했어요. 다시 시도해주세요.");
      }
      return;
    }
    setIsPending(true);
    setTimeout(() => {
      auth.login();
      setIsPending(false);
      goToNext();
    }, 500);
  };

  return (
    <PageContainer>
      <BackButton onClick={() => navigate(-1)} onDark />

      <Overlay />

      <Content>
        <TextArea>
          <Logo>전통주로</Logo>
          <Tagline>
            내 취향에 맞는 양조장부터
            <br />
            여행 코스까지 한 번에
          </Tagline>
          <Subtext>로그인하고 나만의 전통주 여행을 이어가세요</Subtext>
        </TextArea>

        <KakaoLoginButton onClick={handleKakaoLogin} disabled={isPending}>
          {isPending ? "로그인 중..." : "카카오로 로그인"}
        </KakaoLoginButton>
      </Content>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 24px;
  box-sizing: border-box;
  overflow: hidden;
  color: #ffffff;
  /* TODO: Figma에서 내보낸 실제 양조장 사진으로 교체 (background-image) */
  background: linear-gradient(160deg, #6b4a30 0%, #3a2a1c 55%, #1c140c 100%);
  background-size: cover;
  background-position: center;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.75) 100%);
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const TextArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Logo = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
`;

const Tagline = styled.p`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
`;

const Subtext = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
`;
