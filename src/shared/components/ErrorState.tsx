import React from "react";
import styled from "styled-components";
import { colors } from "../styles/colors";
import errorIcon from "../../assets/icon/Error.svg";
import retryIconAsset from "../../assets/icon/Retry.svg";

export interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryIcon?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  onRetry,
  retryLabel = "다시 시도",
  retryIcon,
}) => {
  return (
    <Wrapper>
      <ErrorIcon src={errorIcon} alt="" />
      <TextGroup>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </TextGroup>
      {onRetry && (
        <RetryButton type="button" onClick={onRetry}>
          {retryIcon ? (
            <span aria-hidden>{retryIcon}</span>
          ) : (
            <RetryIconBox>
              <img src={retryIconAsset} alt="" />
            </RetryIconBox>
          )}
          {retryLabel}
        </RetryButton>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 24px 140px;
  text-align: center;
`;

const ErrorIcon = styled.img`
  width: 32px;
  height: 32px;
`;

const TextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${colors.gray[900]};
`;

const Description = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 300;
  line-height: 160%;
  letter-spacing: -0.28px;
  color: ${colors.gray[400]};
  white-space: pre-line;
`;

const RetryButton = styled.button`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 9px 16px;
  border: none;
  border-radius: 8px;
  background-color: ${colors.gray[900]};
  color: ${colors.white};
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  cursor: pointer;
`;

const RetryIconBox = styled.span`
  display: flex;
  width: 24px;
  height: 24px;
  padding: 2px;
  justify-content: center;
  align-items: center;
  gap: 4px;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;

  img {
    width: 100%;
    height: 100%;
  }
`;
