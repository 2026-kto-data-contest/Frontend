import styled from "styled-components";
import bannerBeforeIcon from "../../assets/icon/BannerBefore.svg";
import bannerAfterIcon from "../../assets/icon/BannerAfter.svg";

export interface ExplorePromoBannerProps {
  hasOnboarded: boolean;
  onClick: () => void;
}

export const ExplorePromoBanner = ({ hasOnboarded, onClick }: ExplorePromoBannerProps) => {
  return (
    <Banner type="button" $onboarded={hasOnboarded} onClick={onClick}>
      <Icon src={hasOnboarded ? bannerAfterIcon : bannerBeforeIcon} alt="" />
      <TextArea>
        <Title $onboarded={hasOnboarded}>
          {hasOnboarded ? "취향에 맞춘 여행 코스를 준비했어요" : "취향에 맞는 양조장을 찾아보세요"}
        </Title>
        <Subtitle $onboarded={hasOnboarded}>
          {hasOnboarded
            ? "양조장부터 딱 맞는 코스까지, 지금 확인해보세요"
            : "1분이면 딱맞는 양조장과 여행 코스를 추천해드려요"}
        </Subtitle>
      </TextArea>
    </Banner>
  );
};

const Banner = styled.button<{ $onboarded: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin: 12px 16px 0;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  background-color: ${(props) => (props.$onboarded ? "#eef1f2" : "#fff5e6")};
`;

const Icon = styled.img`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
`;

const TextArea = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Title = styled.span<{ $onboarded: boolean }>`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${(props) => (props.$onboarded ? "#374151" : "#7a4a1f")};
`;

const Subtitle = styled.span<{ $onboarded: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.$onboarded ? "#6b7280" : "#a06a3a")};
`;
