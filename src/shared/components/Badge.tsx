import React from "react";
import styled, { css } from "styled-components";
import { colors } from "../styles/colors";

type BadgeTone = "primary" | "gray" | "neutral" | "danger" | "success" | "warning";
type BadgeShape = "pill" | "flat";
// flat 배지의 크기: sm은 WineryCard 등에서 쓰는 기본 크기, md는 양조장 상세 페이지 Figma 스펙(4px 8px, 12px)입니다.
type BadgeSize = "sm" | "md";

export interface BadgeProps {
  label: string | number;
  tone?: BadgeTone;
  shape?: BadgeShape;
  size?: BadgeSize;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  tone = "gray",
  shape = "pill",
  size = "sm",
  className,
}) => {
  return (
    <StyledBadge $tone={tone} $shape={shape} $size={size} className={className}>
      {label}
    </StyledBadge>
  );
};

const toneStyles: Record<BadgeTone, ReturnType<typeof css>> = {
  primary: css`
    background-color: ${colors.primary[50]};
    color: ${colors.primary[600]};
  `,
  gray: css`
    background-color: ${colors.info.bg};
    color: ${colors.info.text};
  `,
  neutral: css`
    background-color: ${colors.gray[50]};
    color: ${colors.gray[600]};
  `,
  danger: css`
    background-color: #fee2e2;
    color: ${colors.danger};
  `,
  success: css`
    background-color: #dcfce7;
    color: ${colors.success};
  `,
  warning: css`
    background-color: #fef3c7;
    color: ${colors.warning};
  `,
};

const shapeStyles: Record<BadgeShape, ReturnType<typeof css>> = {
  pill: css`
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  `,
  flat: css`
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 0.6875rem;
    font-weight: 400;
  `,
};

const flatSizeStyles: Record<BadgeSize, ReturnType<typeof css> | null> = {
  sm: null,
  md: css`
    padding: 4px 8px;
    font-size: 0.75rem;
  `,
};

const StyledBadge = styled.span<{ $tone: BadgeTone; $shape: BadgeShape; $size: BadgeSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  white-space: nowrap;
  ${(props) => shapeStyles[props.$shape]}
  ${(props) => props.$shape === "flat" && flatSizeStyles[props.$size]}
  ${(props) => toneStyles[props.$tone]}
`;
