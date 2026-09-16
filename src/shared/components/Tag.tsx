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
  padding: 4px 8px;
  border-radius: 9999px;
  background-color: ${colors.info.bg};
  color: ${colors.info.text};
  font-size: 0.75rem;
  font-weight: 400;
  white-space: nowrap;
`;
