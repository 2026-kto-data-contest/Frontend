import type { ReactNode } from "react";
import styled from "styled-components";
import { BackButton } from "../../../shared/components/BackButton";
import { colors } from "../../../shared/styles/colors";

export interface OnboardingLayoutProps {
  step: 1 | 2 | 3;
  title: ReactNode;
  subtitle: string;
  onBack: () => void;
  onSkip: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** 저장 실패 등으로 다음 화면 이동을 막았을 때 보여줄 안내 문구입니다. */
  error?: string | null;
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
}: OnboardingLayoutProps) => {
  return (
    <PageContainer>
      <Header>
        <BackButton onClick={onBack} />
        <SkipButton type="button" onClick={onSkip}>
          건너뛰기
        </SkipButton>
      </Header>

      <ProgressRow>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <ProgressSegment key={i} $active={i < step} />
        ))}
      </ProgressRow>

      <Title>{title}</Title>
      <Subtitle>{subtitle}</Subtitle>

      <Content>{children}</Content>

      {error && <ErrorText>{error}</ErrorText>}
      <Footer>{footer}</Footer>
    </PageContainer>
  );
};

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 24px 24px;
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
  color: ${colors.gray[400]};
  cursor: pointer;
`;

const ProgressRow = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 16px;
`;

const ProgressSegment = styled.div<{ $active: boolean }>`
  flex: 1;
  height: 4px;
  border-radius: 9999px;
  background-color: ${(props) => (props.$active ? "#ff7a00" : colors.gray[200])};
`;

const Title = styled.h1`
  margin: 24px 0 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
  color: ${colors.gray[900]};
`;

const Subtitle = styled.p`
  margin: 8px 0 0;
  font-size: 0.875rem;
  color: ${colors.gray[500]};
`;

const Content = styled.div`
  flex: 1;
  margin-top: 24px;
  overflow-y: auto;
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
