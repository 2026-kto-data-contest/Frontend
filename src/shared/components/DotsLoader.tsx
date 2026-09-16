import styled, { keyframes } from "styled-components";
import { colors } from "../styles/colors";

export function DotsLoader() {
  return (
    <DotsLoaderWrap role="status" aria-label="불러오는 중">
      <LoaderDot $delay={0} />
      <LoaderDot $delay={0.15} />
      <LoaderDot $delay={0.3} />
    </DotsLoaderWrap>
  );
}

// Figma "Progress Loading" 컴포넌트: 점 3개가 opacity 1 → 0.4 → 0.1 순서로 번갈아 밝아지는 모션입니다.
const dotPulse = keyframes`
  0%, 80%, 100% { opacity: 0.1; }
  40% { opacity: 1; }
`;

const DotsLoaderWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 48px 0;
`;

const LoaderDot = styled.span<{ $delay: number }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${colors.primary[500]};
  animation: ${dotPulse} 1.1s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
`;
