import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { completeKakaoLogin } from "../../shared/lib/kakao";
import { useAuth } from "../../shared/lib/authContext";

export default function KakaoCallbackPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get("code");
    const kakaoError = searchParams.get("error");
    const from = sessionStorage.getItem("kakao:from") || "/";
    sessionStorage.removeItem("kakao:from");

    if (kakaoError || !code) {
      setErrorMessage("카카오 로그인이 취소됐어요.");
      return;
    }

    completeKakaoLogin(code)
      .then((profile) => {
        auth.login(profile.nickname);
        if (auth.hasOnboarded) {
          navigate(from, { replace: true });
        } else {
          navigate(`/signin/terms?from=${encodeURIComponent(from)}`, { replace: true });
        }
      })
      .catch((error) => {
        console.error(error);
        setErrorMessage("카카오 로그인에 실패했어요. 다시 시도해주세요.");
      });
  }, [auth, navigate, searchParams]);

  return (
    <PageContainer>
      {errorMessage ? (
        <>
          <Message>{errorMessage}</Message>
          <RetryButton type="button" onClick={() => navigate("/signin", { replace: true })}>
            로그인 화면으로 돌아가기
          </RetryButton>
        </>
      ) : (
        <Message>카카오 로그인 처리 중...</Message>
      )}
    </PageContainer>
  );
}

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  box-sizing: border-box;
`;

const Message = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  color: #444444;
  text-align: center;
`;

const RetryButton = styled.button`
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  background: #ff7a00;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
`;
