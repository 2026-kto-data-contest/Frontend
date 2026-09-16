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

const dotPulse = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
`;

const DotsLoaderWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 0;
`;

const LoaderDot = styled.span<{ $delay: number }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${colors.primary[500]};
  animation: ${dotPulse} 1.1s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
`;
