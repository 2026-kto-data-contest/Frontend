import React from "react";
import styled, { css } from "styled-components";
import { colors } from "../styles/colors";

export interface PhotoCardProps {
  name: string;
  region: string;
  description?: string;
  large?: boolean;
  fluid?: boolean;
  onClick?: () => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  name,
  region,
  description,
  large = false,
  fluid = false,
  onClick,
}) => {
  return (
    <Wrapper $large={large} $fluid={fluid} onClick={onClick} $clickable={!!onClick}>
      <Thumb $large={large} />
      <Body $large={large}>
        <Name>{name}</Name>
        <Region>{region}</Region>
        {description && <Description>{description}</Description>}
      </Body>
    </Wrapper>
  );
};

const Wrapper = styled.div<{ $large: boolean; $fluid: boolean; $clickable: boolean }>`
  display: flex;
  flex-direction: column;
  cursor: ${(props) => (props.$clickable ? "pointer" : "default")};

  ${(props) =>
    props.$large &&
    css`
      border: 0.5px solid ${colors.gray[200]};
      border-radius: 12px;
      overflow: hidden;
    `}

  ${(props) =>
    props.$fluid ? "width: 100%;" : `flex-shrink: 0; width: ${props.$large ? "220px" : "120px"};`}
`;

const Thumb = styled.div<{ $large: boolean }>`
  width: 100%;
  height: ${(props) => (props.$large ? "180px" : "120px")};
  border-radius: ${(props) => (props.$large ? "0" : "12px")};
  background: linear-gradient(160deg, #8a6a4a 0%, #4a3626 100%);
`;

const Body = styled.div<{ $large: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  ${(props) => (props.$large ? "padding: 12px;" : "padding-top: 8px;")}
`;

const Name = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const Region = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${colors.gray[400]};
`;

const Description = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 300;
  color: ${colors.gray[900]};
  line-height: 1.4;
  margin: 4px 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;
