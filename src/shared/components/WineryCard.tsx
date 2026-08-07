import React from "react";
import styled from "styled-components";
import { colors } from "../styles/colors";
import { Tag } from "./Tag";
import { Badge } from "./Badge";
import type { Winery } from "../lib/mockWineries";

export interface WineryCardProps {
  winery: Winery;
  onClick?: () => void;
  showDescription?: boolean;
  showTags?: boolean;
  nameFirst?: boolean;
  thumbSize?: number;
}

export const WineryCard: React.FC<WineryCardProps> = ({
  winery,
  onClick,
  showDescription = true,
  showTags = true,
  nameFirst = false,
  thumbSize,
}) => {
  const visibleTags = winery.tags.slice(0, 2);
  const hiddenTagCount = winery.tags.length - visibleTags.length;

  const nameEl = (
    <Name>
      {winery.name} · {winery.productName}
    </Name>
  );
  const regionEl = <Region>{winery.detailRegion}</Region>;

  return (
    <Row onClick={onClick} $clickable={!!onClick}>
      <Thumb $size={thumbSize} />
      <Info>
        {nameFirst ? (
          <>
            {nameEl}
            {regionEl}
          </>
        ) : (
          <>
            {regionEl}
            {nameEl}
          </>
        )}
        {showDescription && <Description>{winery.description}</Description>}
        {showTags && (
          <TagRow>
            {visibleTags.map((tag) => (
              <Tag key={tag} label={`#${tag}`} />
            ))}
            {hiddenTagCount > 0 && <Tag label={`+${hiddenTagCount}`} />}
          </TagRow>
        )}
        {winery.badges && winery.badges.length > 0 && (
          <BadgeRow>
            {winery.badges.map((badge) => (
              <Badge key={badge} label={badge} tone="gray" />
            ))}
          </BadgeRow>
        )}
      </Info>
    </Row>
  );
};

const Row = styled.div<{ $clickable: boolean }>`
  display: flex;
  gap: 12px;
  cursor: ${(props) => (props.$clickable ? "pointer" : "default")};
`;

const Thumb = styled.div<{ $size?: number }>`
  flex-shrink: 0;
  width: ${(props) => (props.$size ? `${props.$size}px` : "100px")};
  height: ${(props) => (props.$size ? `${props.$size}px` : "136px")};
  border-radius: 12px;
  background: linear-gradient(160deg, #b08968 0%, #6b4a30 100%);
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  justify-content: center;
`;

const Region = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: ${colors.gray[400]};
`;

const Name = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const Description = styled.p`
  margin: 6px 0;
  font-size: 14px;
  font-weight: 300;
  color: ${colors.gray[500]};
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const TagRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 2px;
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 4px;
`;
