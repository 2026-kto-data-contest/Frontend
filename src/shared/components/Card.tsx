import React from "react";
import styled from "styled-components";
import { colors } from "../styles/colors";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, ...props }) => {
  return <StyledCard {...props}>{children}</StyledCard>;
};

const StyledCard = styled.div`
  background-color: ${colors.white};
  border: 1px solid ${colors.gray[200]};
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
`;
