import styled from "styled-components";
import bannerBeforeIcon from "../../assets/icon/BannerBefore.png";
import bannerAfterIcon from "../../assets/icon/BannerAfter.svg";

export interface ExplorePromoBannerProps {
  hasOnboarded: boolean;
  onClick: () => void;
  /** 취향 맞춤 양조장을 조회하는 동안 중복 클릭만 막습니다(로딩 표시는 따로 안 보여줌). */
  loading?: boolean;
}

export const ExplorePromoBanner = ({
  hasOnboarded,
  onClick,
  loading,
}: ExplorePromoBannerProps) => {
  return (
    <Banner type="button" $onboarded={hasOnboarded} onClick={onClick} disabled={loading}>
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
  padding: 16px 20px;
  margin: 10px 16px 5px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  background-color: ${(props) => (props.$onboarded ? "#eef1f2" : "#fff5e6")};
`;

const Icon = styled.img`
  flex-shrink: 0;
  width: 48px;
  height: 48px;
`;

const TextArea = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const Title = styled.span<{ $onboarded: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${(props) => (props.$onboarded ? "#374151" : "#171716")};
`;

const Subtitle = styled.span<{ $onboarded: boolean }>`
  font-size: 0.6875rem;
  line-height: 100%;
  color: ${(props) => (props.$onboarded ? "#6b7280" : "#b0b0ae")};
`;
