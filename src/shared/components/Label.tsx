import React from "react";
import styled from "styled-components";
import { colors } from "../styles/colors";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ children, required = false, ...props }) => {
  return (
    <StyledLabel {...props}>
      {children}
      {required && <RequiredMark aria-hidden>*</RequiredMark>}
    </StyledLabel>
  );
};

const StyledLabel = styled.label`
  display: inline-block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${colors.gray[700]};
`;

const RequiredMark = styled.span`
  margin-left: 2px;
  color: ${colors.danger};
`;
