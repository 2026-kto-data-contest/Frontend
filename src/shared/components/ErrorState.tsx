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
            <img src={retryIconAsset} alt="" width={16} height={16} />
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
  padding: 80px 24px;
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
  font-size: 1rem;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${colors.gray[900]};
`;

const Description = styled.p`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 300;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[400]};
  white-space: pre-line;
`;

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 10px 20px;
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
