import React from "react";
import styled, { css } from "styled-components";
import { colors } from "../styles/colors";

type BadgeTone = "primary" | "gray" | "danger" | "success" | "warning";

export interface BadgeProps {
  label: string | number;
  tone?: BadgeTone;
}

export const Badge: React.FC<BadgeProps> = ({ label, tone = "gray" }) => {
  return <StyledBadge $tone={tone}>{label}</StyledBadge>;
};

const toneStyles: Record<BadgeTone, ReturnType<typeof css>> = {
  primary: css`
    background-color: ${colors.primary[50]};
    color: ${colors.primary[600]};
  `,
  gray: css`
    background-color: ${colors.gray[100]};
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

const StyledBadge = styled.span<{ $tone: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  ${(props) => toneStyles[props.$tone]}
`;
