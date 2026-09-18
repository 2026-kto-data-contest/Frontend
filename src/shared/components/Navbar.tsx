import type { ReactNode } from "react";
import styled from "styled-components";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import { useScrollToTop } from "../lib/pageState";
import homeIcon from "../../assets/icon/HomeIcon.svg";
import mapIcon from "../../assets/icon/MapIcon.svg";
import breweryIcon from "../../assets/icon/BreweryIcon.svg";
import myIcon from "../../assets/icon/MyIcon.svg";

export const NAVBAR_HEIGHT = 64;

interface NavItem {
  id: string;
  label: string;
  path: string;
  isActive: boolean;
  icon: ReactNode;
  onClick?: () => void;
}

interface NavLinkProps {
  $isActive: boolean;
}

export const Navbar = () => {
  const location = useLocation();
  const auth = useAuth();
  const { pathname } = location;
  const scrollHomeToTop = useScrollToTop("/");

  const navItems: NavItem[] = [
    {
      id: "home",
      label: "홈",
      path: "/",
      isActive: pathname === "/",
      icon: <NavIcon $src={homeIcon} />,
      onClick: pathname === "/" ? scrollHomeToTop : undefined,
    },
    {
      id: "map",
      label: "지도",
      path: "/map",
      isActive: pathname === "/map",
      icon: <NavIcon $src={mapIcon} />,
    },
    {
      id: "explore",
      label: "양조장",
      path: "/explore",
      isActive: pathname.startsWith("/explore"),
      icon: <NavIcon $src={breweryIcon} />,
    },
    {
      id: "mypage",
      label: "마이",
      path: !auth.isLoggedIn
        ? "/login?from=%2F"
        : !auth.termsAgreed
          ? "/terms"
          : "/mypage",
      isActive: pathname === "/mypage",
      icon: <NavIcon $src={myIcon} />,
    },
  ];

  return (
    <BottomNavbar>
      <NavList>
        {navItems.map((item) => (
          <li key={item.id}>
            <StyledNavLink to={item.path} $isActive={item.isActive} onClick={item.onClick}>
              {item.icon}
              {item.label}
            </StyledNavLink>
          </li>
        ))}
      </NavList>
    </BottomNavbar>
  );
};

const BottomNavbar = styled.nav`
  flex-shrink: 0;
  height: ${NAVBAR_HEIGHT}px;
  background-color: #ffffff;
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 40px;
  box-sizing: border-box;
`;

const NavList = styled.ul`
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    flex: 1;
    height: 100%;
  }
`;

const StyledNavLink = styled(Link)<NavLinkProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 100%;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 400;
  line-height: 1;
  color: ${(props) => (props.$isActive ? "#171716" : "#b0b0ae")};
  opacity: ${(props) => (props.$isActive ? 1 : 0.5)};
  text-decoration: none;
  transition:
    color 0.2s ease-in-out,
    opacity 0.2s ease-in-out;

  &:hover {
    color: #171716;
    opacity: 1;
  }
`;

// 아이콘 파일 자체는 색이 고정돼 있어, 모양만 마스크로 떠서 currentColor(active/inactive 색)를 입힙니다.
const NavIcon = styled.span<{ $src: string }>`
  display: inline-block;
  width: 24px;
  height: 24px;
  background-color: currentColor;
  -webkit-mask-image: url("${(props) => props.$src}");
  mask-image: url("${(props) => props.$src}");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
`;
