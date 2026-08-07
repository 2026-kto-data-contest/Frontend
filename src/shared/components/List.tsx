import React from "react";
import styled from "styled-components";
import { colors } from "../styles/colors";

export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode;
}

export const List: React.FC<ListProps> = ({ children, ...props }) => {
  return <StyledList {...props}>{children}</StyledList>;
};

export interface ListItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  children: React.ReactNode;
}

export const ListItem: React.FC<ListItemProps> = ({ children, ...props }) => {
  return <StyledListItem {...props}>{children}</StyledListItem>;
};

const StyledList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledListItem = styled.li`
  display: flex;
  align-items: center;
  padding: 12px 4px;
  border-bottom: 1px solid ${colors.gray[100]};
  font-size: 0.9375rem;
  color: ${colors.gray[800]};

  &:last-child {
    border-bottom: none;
  }
`;
