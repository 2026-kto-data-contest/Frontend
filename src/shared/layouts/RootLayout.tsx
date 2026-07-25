import type { ReactNode } from "react";
import styled from "styled-components";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

const Backdrop = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #e5e5e5;

  @media (max-width: ${PHONE_WIDTH}px) {
    align-items: stretch;
    background-color: #ffffff;
  }
`;

const PhoneFrame = styled.div`
  width: ${PHONE_WIDTH}px;
  height: ${PHONE_HEIGHT}px;
  overflow-y: auto;
  background-color: #ffffff;
  position: relative;

  @media (min-width: ${PHONE_WIDTH + 1}px) {
    margin: 32px 0;
    border-radius: 32px;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.06),
      0 24px 48px rgba(0, 0, 0, 0.18);
  }

  @media (max-width: ${PHONE_WIDTH}px) {
    width: 100%;
    height: 100vh;
  }
`;

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <Backdrop>
      <PhoneFrame>{children}</PhoneFrame>
    </Backdrop>
  );
}
