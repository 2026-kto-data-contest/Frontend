import styled from "styled-components";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { useScrollRestoration } from "../lib/pageState";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

export const Layout = () => {
  const { pathname } = useLocation();
  const { ref, handleScroll } = useScrollRestoration(pathname);

  return (
    <Backdrop>
      <PhoneFrame>
        <ScrollArea ref={ref} onScroll={handleScroll}>
          <MainContent>
            <Outlet />
          </MainContent>
        </ScrollArea>

        <Navbar />
      </PhoneFrame>
    </Backdrop>
  );
};

export const AuthLayout = () => {
  const { pathname } = useLocation();
  const { ref, handleScroll } = useScrollRestoration(pathname);

  return (
    <Backdrop>
      <PhoneFrame>
        <ScrollArea ref={ref} onScroll={handleScroll}>
          <FullBleedContent>
            <Outlet />
          </FullBleedContent>
        </ScrollArea>
      </PhoneFrame>
    </Backdrop>
  );
};

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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #ffffff;
  position: relative;
  transform: translateZ(0);

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

const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
`;

const FullBleedContent = styled.main`
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
`;
