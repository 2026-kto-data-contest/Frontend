import React from "react";
import styled, { css } from "styled-components";
import { colors } from "../styles/colors";

type BadgeTone = "primary" | "gray" | "danger" | "success" | "warning";
type BadgeShape = "pill" | "flat";

export interface BadgeProps {
  label: string | number;
  tone?: BadgeTone;
  shape?: BadgeShape;
}

export const Badge: React.FC<BadgeProps> = ({ label, tone = "gray", shape = "pill" }) => {
  return (
    <StyledBadge $tone={tone} $shape={shape}>
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

const StyledBadge = styled.span<{ $tone: BadgeTone; $shape: BadgeShape }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  white-space: nowrap;
  ${(props) => shapeStyles[props.$shape]}
  ${(props) => toneStyles[props.$tone]}
`;
