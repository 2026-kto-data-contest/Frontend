import styled from "styled-components";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import { useScrollToTop } from "../lib/pageState";

export const NAVBAR_HEIGHT = 60;

interface NavItem {
  id: string;
  label: string;
  path: string;
  isActive: boolean;
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
      onClick: pathname === "/" ? scrollHomeToTop : undefined,
    },
    { id: "map", label: "지도", path: "/map", isActive: pathname === "/map" },
    { id: "explore", label: "탐색", path: "/explore", isActive: pathname.startsWith("/explore") },
    {
      id: "mypage",
      label: "마이",
      path: auth.isLoggedIn ? "/mypage" : "/signin?from=%2Fmypage",
      isActive: pathname === "/mypage",
    },
  ];

  return (
    <BottomNavbar>
      <NavList>
        {navItems.map((item) => (
          <li key={item.id}>
            <StyledNavLink to={item.path} $isActive={item.isActive} onClick={item.onClick}>
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
  font-size: 0.875rem;
  font-weight: ${(props) => (props.$isActive ? "700" : "500")};
  color: ${(props) => (props.$isActive ? "#ff7a00" : "#6b7280")};
  text-decoration: none;
  padding: 8px 12px;
  transition: color 0.2s ease-in-out;

  &:hover {
    color: #ff7a00;
  }
`;
