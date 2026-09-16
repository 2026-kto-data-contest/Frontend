import type { ReactNode } from "react";
import styled from "styled-components";
import { BackButton } from "./BackButton";
import { colors } from "../styles/colors";

export interface AppBarProps {
  title?: ReactNode;
  align?: "center" | "left";
  onBack?: () => void;
  trailing?: ReactNode;
}

export const AppBar = ({ title, align = "center", onBack, trailing }: AppBarProps) => {
  return (
    <Container>
      <Side>{onBack && <BackButton onClick={onBack} />}</Side>
      <Title $align={align}>{title}</Title>
      <Side $end>{trailing}</Side>
    </Container>
  );
};

const Container = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  padding: 8px 16px;
  box-sizing: border-box;
  background-color: #ffffff;
`;

const Side = styled.div<{ $end?: boolean }>`
  flex-shrink: 0;
  min-width: 28px;
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$end ? "flex-end" : "flex-start")};
`;

const Title = styled.h1<{ $align: "center" | "left" }>`
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
  text-align: ${(props) => props.$align};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
