import type { ReactNode } from "react";
import styled from "styled-components";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import { useScrollToTop } from "../lib/pageState";
import homeIcon from "../../assets/icon/HomeIcon.svg";
import mapIcon from "../../assets/icon/MapIcon.svg";
import breweryIcon from "../../assets/icon/BreweryIcon.svg";
import myIcon from "../../assets/icon/MyIcon.svg";

export const NAVBAR_HEIGHT = 60;

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
      path: auth.isLoggedIn ? "/mypage" : "/login?from=%2Fmypage",
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
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NavList = styled.ul`
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const StyledNavLink = styled(Link)<NavLinkProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 0.75rem;
  font-weight: ${(props) => (props.$isActive ? "700" : "500")};
  color: ${(props) => (props.$isActive ? "#171716" : "#b0b0ae")};
  text-decoration: none;
  padding: 8px 12px;
  transition: color 0.2s ease-in-out;

  &:hover {
    color: #171716;
  }
`;

// 아이콘 파일 자체는 색이 고정돼 있어, 모양만 마스크로 떠서 currentColor(active/inactive 색)를 입힙니다.
const NavIcon = styled.span<{ $src: string }>`
  display: inline-block;
  width: 22px;
  height: 22px;
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
