import React from "react";
import styled, { css } from "styled-components";
import { colors } from "../styles/colors";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  ...props
}) => {
  return (
    <StyledButton $variant={variant} $size={size} {...props}>
      {children}
    </StyledButton>
  );
};

const variantStyles: Record<ButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    background-color: #ff7a00;
    color: ${colors.white};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: #e66e00;
    }

    &:disabled {
      background-color: ${colors.gray[300]};
    }
  `,
  secondary: css`
    background-color: ${colors.white};
    color: ${colors.gray[700]};
    border: 1px solid ${colors.gray[300]};

    &:hover:not(:disabled) {
      background-color: ${colors.gray[50]};
    }
  `,
  ghost: css`
    background-color: transparent;
    color: #ff7a00;
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: #fff3e6;
    }
  `,
};

const sizeStyles: Record<ButtonSize, ReturnType<typeof css>> = {
  sm: css`
    padding: 6px 12px;
    font-size: 0.8125rem;
  `,
  md: css`
    padding: 10px 16px;
    font-size: 0.9375rem;
  `,
};

const StyledButton = styled.button<{ $variant: ButtonVariant; $size: ButtonSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition:
    background-color 0.2s ease-in-out,
    color 0.2s ease-in-out;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  ${(props) => sizeStyles[props.$size]}
  ${(props) => variantStyles[props.$variant]}
`;
