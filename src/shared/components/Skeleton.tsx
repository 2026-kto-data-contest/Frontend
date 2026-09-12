import styled from "styled-components";
import { colors } from "../styles/colors";

export interface SkeletonProps {
  $width?: string;
  $height?: string;
  $radius?: string;
}

export const Skeleton = styled.div<SkeletonProps>`
  width: ${(props) => props.$width ?? "100%"};
  height: ${(props) => props.$height ?? "16px"};
  border-radius: ${(props) => props.$radius ?? "6px"};
  flex-shrink: 0;
  background: linear-gradient(
    90deg,
    ${colors.gray[100]} 25%,
    ${colors.gray[200]} 37%,
    ${colors.gray[100]} 63%
  );
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;

  @keyframes skeleton-shimmer {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0 50%;
    }
  }
`;
