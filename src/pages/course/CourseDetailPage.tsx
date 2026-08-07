import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import { colors } from "../../shared/styles/colors";
import { BANNER_ITEMS } from "../../shared/lib/mockCourses";
import { BackButton } from "../../shared/components/BackButton";

// 임시 코스페이지

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const course = BANNER_ITEMS.find((item) => item.id === id);

  if (!course) {
    return (
      <PageContainer>
        <BackButton onClick={() => navigate(-1)} />
        <NotFound>코스 정보를 찾을 수 없어요</NotFound>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton onClick={() => navigate(-1)} />
      <Thumb />
      <Region>{course.region}</Region>
      <Title>{course.title}</Title>
      <Subtitle>{course.subtitle}</Subtitle>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const Thumb = styled.div`
  width: 100%;
  height: 200px;
  border-radius: 16px;
  background: linear-gradient(160deg, #7a5c3e 0%, #3a2a1c 60%, #1c140c 100%);
`;

const Region = styled.p`
  margin: 8px 0 0;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  color: ${colors.gray[600]};
`;

const NotFound = styled.p`
  margin: 40px 0;
  text-align: center;
  color: ${colors.gray[400]};
`;
