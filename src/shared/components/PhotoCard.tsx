import React from "react";
import styled, { css } from "styled-components";
import { colors } from "../styles/colors";
import { resolveImageUrl } from "../api/api";
import noneImage from "../../assets/img/NoneImage.png";

export interface PhotoCardProps {
  name: string;
  region: string;
  description?: string;
  large?: boolean;
  fluid?: boolean;
  photoUrl?: string;
  onClick?: () => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  name,
  region,
  description,
  large = false,
  fluid = false,
  photoUrl,
  onClick,
}) => {
  return (
    <Wrapper $large={large} $fluid={fluid} onClick={onClick} $clickable={!!onClick}>
      <Thumb $large={large} src={resolveImageUrl(photoUrl) ?? noneImage} alt="" />
      <Body $large={large}>
        <TitleRegionGroup $large={large}>
          <Name>{name}</Name>
          <Region>{region}</Region>
        </TitleRegionGroup>
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
      border-radius: 8px;
      overflow: hidden;
      background-color: #ffffff;
      border: 1px solid ${colors.gray[100]};
    `}

  ${(props) =>
    props.$fluid ? "width: 100%;" : `flex-shrink: 0; width: ${props.$large ? "220px" : "120px"};`}
`;

const Thumb = styled.img<{ $large: boolean }>`
  width: 100%;
  height: ${(props) => (props.$large ? "180px" : "120px")};
  border-radius: ${(props) => (props.$large ? "0" : "8px")};
  object-fit: cover;
  background-color: ${colors.gray[50]};
`;

const Body = styled.div<{ $large: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => (props.$large ? "8px" : "4px")};
  ${(props) => (props.$large ? "padding: 16px;" : "padding-top: 8px;")}
`;

const TitleRegionGroup = styled.div<{ $large: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => (props.$large ? "0" : "4px")};
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
  color: ${colors.gray[500]};
`;

const Description = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 300;
  color: ${colors.gray[600]};
  line-height: 1.4;
  margin: 4px 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;
