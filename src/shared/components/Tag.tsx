import styled from "styled-components";
import { colors } from "../styles/colors";

export interface TagProps {
  label: string;
}

export const Tag = ({ label }: TagProps) => {
  return <StyledTag>{label}</StyledTag>;
};

const StyledTag = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 9999px;
  background-color: ${colors.gray[100]};
  color: ${colors.gray[700]};
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
`;
