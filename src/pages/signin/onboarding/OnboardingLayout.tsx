import type { ReactNode } from "react";
import styled from "styled-components";
import { BackButton } from "../../../shared/components/BackButton";
import { colors } from "../../../shared/styles/colors";

export interface OnboardingLayoutProps {
  step: 1 | 2 | 3;
  title: ReactNode;
  subtitle: string;
  onBack: () => void;
  /** 없으면 건너뛰기 버튼을 표시하지 않습니다. (예: 마이페이지에서 개별 수정할 때) */
  onSkip?: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** 저장 실패 등으로 다음 화면 이동을 막았을 때 보여줄 안내 문구입니다. */
  error?: string | null;
  /** 타이틀 블록과 본문 사이 간격. Figma 기준 취향·도수는 32px, 지역은 24px입니다. */
  contentGap?: number;
  /** 3단계 진행 표시줄. 마이페이지에서 개별 항목만 수정할 때는 숨깁니다. */
  showProgress?: boolean;
}

const TOTAL_STEPS = 3;

export const OnboardingLayout = ({
  step,
  title,
  subtitle,
  onBack,
  onSkip,
  children,
  footer,
  error,
  contentGap = 32,
  showProgress = true,
}: OnboardingLayoutProps) => {
  return (
    <PageContainer>
      <Header>
        <BackButton onClick={onBack} />
        {onSkip && (
          <SkipButton type="button" onClick={onSkip}>
            건너뛰기
          </SkipButton>
        )}
      </Header>

      {showProgress && (
        <ProgressRow>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <ProgressSegment key={i} $active={i < step} />
          ))}
        </ProgressRow>
      )}

      <Title>{title}</Title>
      <Subtitle>{subtitle}</Subtitle>

      <Content style={{ marginTop: contentGap }}>{children}</Content>

      {error && <ErrorText>{error}</ErrorText>}
      <Footer>{footer}</Footer>
    </PageContainer>
  );
};

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 24px;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SkipButton = styled.button`
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: ${colors.gray[300]};
  cursor: pointer;
`;

const ProgressRow = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 16px;
`;

const ProgressSegment = styled.div<{ $active: boolean }>`
  flex: 1;
  height: 4px;
  border-radius: 4px;
  background-color: ${(props) => (props.$active ? colors.primary[700] : colors.gray[200])};
`;

const Title = styled.h1`
  margin: 24px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 132%;
  letter-spacing: -0.48px;
  color: ${colors.gray[900]};
`;

const Subtitle = styled.p`
  margin: 8px 0 0;
  font-size: 0.875rem;
  font-weight: 300;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[500]};
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const Footer = styled.div`
  margin-top: 16px;
`;

const ErrorText = styled.p`
  margin: 12px 0 0;
  font-size: 0.8125rem;
  color: #ef4444;
  text-align: center;
`;
