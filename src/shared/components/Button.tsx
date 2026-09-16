import React from "react";
import styled, { css } from "styled-components";
import { colors } from "../styles/colors";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

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
    background-color: #ff8a00;
    color: ${colors.white};
    border: none;

    &:disabled {
      background-color: ${colors.gray[50]};
      color: ${colors.gray[300]};
    }
  `,
  secondary: css`
    background-color: ${colors.gray[50]};
    color: ${colors.gray[900]};
    border: none;

    &:disabled {
      background-color: ${colors.gray[50]};
      color: ${colors.gray[300]};
    }
  `,
  ghost: css`
    background-color: transparent;
    color: #ff8a00;
    border: none;

    &:hover:not(:disabled) {
      background-color: #fff3e6;
    }
  `,
};

const sizeStyles: Record<ButtonSize, ReturnType<typeof css>> = {
  sm: css`
    padding: 8px 12px;
    font-size: 0.8125rem;
    font-weight: 700;
  `,
  md: css`
    padding: 10px 16px;
    font-size: 0.875rem;
    font-weight: 600;
  `,
  lg: css`
    padding: 12px 16px;
    font-size: 1rem;
    font-weight: 700;
  `,
};

const StyledButton = styled.button<{ $variant: ButtonVariant; $size: ButtonSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 9999px;
  cursor: pointer;
  outline: none;
  transition: background-color 0.2s ease-in-out;

  &:disabled {
    cursor: not-allowed;
  }

  ${(props) => sizeStyles[props.$size]}
  ${(props) => variantStyles[props.$variant]}
`;
