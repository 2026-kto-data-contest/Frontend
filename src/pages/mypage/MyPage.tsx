import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { useAuth } from "../../shared/lib/authContext";

//임시 마이페이지

export default function MyPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  return (
    <PageContainer>
      <Title>My Page</Title>
      {auth.isLoggedIn ? (
        <>
          <Content>{auth.nickname}님, 환영합니다.</Content>
          <Button variant="secondary" onClick={auth.logout}>
            로그아웃
          </Button>
        </>
      ) : (
        <>
          <Content>마이 페이지 화면입니다.</Content>
          <Button variant="primary" onClick={() => navigate("/signin?from=%2Fmypage")}>
            로그인
          </Button>
        </>
      )}
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  background-color: #f9fafb;
  min-height: calc(100vh - 60px);
  box-sizing: border-box;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`;

const Content = styled.p`
  font-size: 1rem;
  color: #4b5563;
  margin: 0;
`;
