import styled, { keyframes } from "styled-components";
import bannerBeforeIcon from "../../assets/icon/BannerBefore.svg";
import bannerAfterIcon from "../../assets/icon/BannerAfter.svg";

export interface ExplorePromoBannerProps {
  hasOnboarded: boolean;
  onClick: () => void;
  /** 취향 맞춤 양조장을 조회하는 동안 클릭을 막고, 아이콘 자리에 로딩 표시를 보여줍니다. */
  loading?: boolean;
}

export const ExplorePromoBanner = ({
  hasOnboarded,
  onClick,
  loading,
}: ExplorePromoBannerProps) => {
  return (
    <Banner type="button" $onboarded={hasOnboarded} onClick={onClick} disabled={loading}>
      {loading ? (
        <DotsWrap role="status" aria-label="불러오는 중">
          <Dot $delay={0} />
          <Dot $delay={0.15} />
          <Dot $delay={0.3} />
        </DotsWrap>
      ) : (
        <Icon src={hasOnboarded ? bannerAfterIcon : bannerBeforeIcon} alt="" />
      )}
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

// DotsLoader(src/shared/components/DotsLoader.tsx)와 같은 모션을 배너 아이콘(48x48) 자리에
// 맞춰 작게 씁니다.
const dotPulse = keyframes`
  0%, 80%, 100% { opacity: 0.1; }
  40% { opacity: 1; }
`;

const DotsWrap = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 48px;
  height: 48px;
`;

const Dot = styled.span<{ $delay: number }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ff8a00;
  animation: ${dotPulse} 1.1s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
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
