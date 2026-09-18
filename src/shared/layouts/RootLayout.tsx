import styled from "styled-components";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { useScrollRestoration } from "../lib/pageState";
import { NavbarVisibilityProvider, useNavbarVisibility } from "../lib/navbarVisibility";

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
// 실제 휴대폰 화면 너비는 대부분 390~430px 사이라, 이 폭까지는 "실제 기기"로 보고
// 화면 전체를 그대로 채운다. 그보다 넓으면(데스크탑 등) 고정 크기 박스로 보여준다.
const MOBILE_BREAKPOINT = 480;

export const Layout = () => {
  const { pathname } = useLocation();
  const { ref, handleScroll } = useScrollRestoration(pathname);

  return (
    <Backdrop>
      <PhoneFrame>
        <NavbarVisibilityProvider>
          <ScrollArea ref={ref} onScroll={handleScroll}>
            <MainContent>
              <Outlet />
            </MainContent>
          </ScrollArea>

          <NavbarGate />
        </NavbarVisibilityProvider>
      </PhoneFrame>
    </Backdrop>
  );
};

const NavbarGate = () => {
  const { hidden } = useNavbarVisibility();
  return hidden ? null : <Navbar />;
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
  min-height: 100dvh;
  background-color: #e5e5e5;

  @media (max-width: ${MOBILE_BREAKPOINT}px) {
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

  @media (max-width: ${MOBILE_BREAKPOINT}px) {
    width: 100%;
    height: 100vh;
    height: 100dvh;
  }
`;

const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
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
