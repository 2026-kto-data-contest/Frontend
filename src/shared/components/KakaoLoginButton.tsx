import React from "react";
import styled from "styled-components";

export interface KakaoLoginButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const KakaoLoginButton: React.FC<KakaoLoginButtonProps> = ({ children, ...props }) => {
  return (
    <StyledButton type="button" {...props}>
      <KakaoIcon aria-hidden viewBox="0 0 24 24">
        <path d="M12 3C6.48 3 2 6.58 2 11c0 2.79 1.86 5.24 4.66 6.65-.2.73-.73 2.67-.84 3.09-.13.51.19.5.4.37.16-.11 2.55-1.73 3.58-2.43.71.1 1.45.16 2.2.16 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
      </KakaoIcon>
      <span>{children ?? "카카오로 로그인"}</span>
    </StyledButton>
  );
};

const StyledButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background-color: #fee500;
  color: #191919;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: #fada00;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const KakaoIcon = styled.svg`
  width: 18px;
  height: 18px;
  fill: #191919;
`;
