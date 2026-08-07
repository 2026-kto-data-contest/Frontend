import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import { WINERIES } from "../../shared/lib/mockWineries";
import { colors } from "../../shared/styles/colors";
import { Tag } from "../../shared/components/Tag";
import { BackButton } from "../../shared/components/BackButton";

//임시 양조장 상세페이지

export default function WineryDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const winery = WINERIES.find((item) => item.id === id);

  if (!winery) {
    return (
      <PageContainer>
        <BackButton onClick={() => navigate(-1)} />
        <NotFound>양조장 정보를 찾을 수 없어요</NotFound>
      </PageContainer>
    );
  }

  const visibleTags = winery.tags.slice(0, 2);
  const hiddenTagCount = winery.tags.length - visibleTags.length;

  return (
    <PageContainer>
      <BackButton onClick={() => navigate(-1)} />
      <Thumb />
      <Region>{winery.detailRegion}</Region>
      <Name>
        {winery.name} · {winery.productName}
      </Name>
      <Description>{winery.description}</Description>
      <TagRow>
        {visibleTags.map((tag) => (
          <Tag key={tag} label={`#${tag}`} />
        ))}
        {hiddenTagCount > 0 && <Tag label={`+${hiddenTagCount}`} />}
      </TagRow>
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
  background: linear-gradient(160deg, #b08968 0%, #6b4a30 100%);
`;

const Region = styled.p`
  margin: 8px 0 0;
  font-size: 0.8125rem;
  color: ${colors.gray[400]};
`;

const Name = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const Description = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  color: ${colors.gray[600]};
  line-height: 1.5;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const NotFound = styled.p`
  margin: 40px 0;
  text-align: center;
  color: ${colors.gray[400]};
`;
