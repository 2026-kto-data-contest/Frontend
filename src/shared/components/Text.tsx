import React from "react";
import styled, { css } from "styled-components";
import { colors } from "../styles/colors";

type TextVariant = "heading1" | "heading2" | "heading3" | "body" | "caption";

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TextVariant;
  color?: string;
  as?: React.ElementType;
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = "body",
  color = colors.gray[900],
  as,
  children,
  ...props
}) => {
  return (
    <StyledText as={as} $variant={variant} $color={color} {...props}>
      {children}
    </StyledText>
  );
};

const variantStyles: Record<TextVariant, ReturnType<typeof css>> = {
  heading1: css`
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.3;
  `,
  heading2: css`
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.35;
  `,
  heading3: css`
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.4;
  `,
  body: css`
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
  `,
  caption: css`
    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.4;
  `,
};

interface StyledTextProps {
  $variant: TextVariant;
  $color: string;
}

const StyledText = styled.span<StyledTextProps>`
  margin: 0;
  color: ${(props) => props.$color};
  ${(props) => variantStyles[props.$variant]}
`;
