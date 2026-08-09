import { useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KakaoLoginButton } from "../../shared/components/KakaoLoginButton";
import { BackButton } from "../../shared/components/BackButton";
import { startKakaoLogin, isKakaoConfigured } from "../../shared/lib/kakao";
import { useAuth } from "../../shared/lib/authContext";
import loginBg from "../../assets/img/Login.png";

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

      <TopOverlay />
      <BottomOverlay />

      <TopContent>
        <LogoRow>
          <LogoIcon viewBox="0 0 33 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="3.40626" cy="21.5225" r="2.78712" fill="#FF8A00" />
            <path
              d="M22.2051 0.30957C24.5345 0.309649 26.4775 2.15188 26.4775 4.49023C26.4775 6.82862 24.5345 8.67082 22.2051 8.6709H4.90137L4.67969 8.68164C3.59002 8.78808 2.7873 9.67201 2.78711 10.6836C2.78714 11.7627 3.70069 12.6973 4.90137 12.6973H22.9951C24.0162 12.6972 24.9189 12.6957 25.6279 12.8164C26.409 12.9495 27.1491 13.2612 27.6465 14.0234C28.082 14.691 28.2276 15.5636 28.2969 16.5195C28.3682 17.5032 28.3682 18.796 28.3682 20.4385H30.3486C30.947 20.4386 31.4325 20.9241 31.4326 21.5225C31.4326 22.121 30.9471 22.6063 30.3486 22.6064H9.44531C8.84672 22.6064 8.36136 22.121 8.36133 21.5225C8.36149 20.924 8.8468 20.4385 9.44531 20.4385H26.2002C26.2002 18.7621 26.1991 17.5627 26.1348 16.6758C26.0679 15.7543 25.94 15.3751 25.8311 15.208C25.7839 15.1357 25.7077 15.0288 25.2637 14.9531C24.7632 14.8679 24.0558 14.8643 22.9268 14.8643H4.90137C2.56969 14.8643 0.619171 13.0251 0.619141 10.6836C0.619339 8.41017 2.45804 6.61031 4.69922 6.50781C4.73318 6.50461 4.76794 6.50293 4.80273 6.50293H22.2051C23.3972 6.50285 24.3095 5.57234 24.3096 4.49023C24.3095 3.40816 23.3972 2.47762 22.2051 2.47754H2.0127C1.41415 2.47748 0.928741 1.9921 0.928711 1.39355C0.928711 0.79498 1.41413 0.30963 2.0127 0.30957H22.2051Z"
              fill="#ffffff"
            />
          </LogoIcon>
          <LogoText>전통주로</LogoText>
        </LogoRow>
        <Tagline>
          내 취향에 맞는 양조장부터
          <br />
          여행 코스까지 한 번에
        </Tagline>
      </TopContent>

      <BottomContent>
        <Subtext>로그인하고 나만의 전통주 여행을 이어가세요</Subtext>
        <KakaoLoginButton onClick={handleKakaoLogin} disabled={isPending}>
          {isPending ? "로그인 중..." : "카카오로 로그인"}
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

const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LogoIcon = styled.svg`
  width: 28px;
  height: 22px;
`;

const LogoText = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
`;

const Tagline = styled.p`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
`;

const BottomContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Subtext = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
`;
