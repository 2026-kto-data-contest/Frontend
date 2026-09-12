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
      <Title>{title}</Title>
      <Description>{description}</Description>
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
  gap: 12px;
  padding: 80px 24px;
  text-align: center;
`;

const ErrorIcon = styled.img`
  width: 40px;
  height: 40px;
`;

const Title = styled.p`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const Description = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${colors.gray[500]};
  line-height: 1.5;
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
  cursor: pointer;
`;
