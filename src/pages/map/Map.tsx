import styled from "styled-components";

//임시 지도페이지

export default function Map() {
  return (
    <PageContainer>
      <Title>Map Page</Title>
      <Content>지도 페이지 화면입니다.</Content>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background-color: #f9fafb;
  min-height: calc(100vh - 60px); /* 하단 네비게이션 바 높이(60px) 제외 */
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
