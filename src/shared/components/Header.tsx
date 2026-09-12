import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import logoIcon from "../../assets/icon/Logo.svg";
import searchIcon from "../../assets/icon/Search.svg";
import { colors } from "../styles/colors";

export const Header = () => {
  const navigate = useNavigate();

  return (
    <HeaderContainer>
      <LogoButton type="button" aria-label="홈으로 이동" onClick={() => navigate("/")}>
        <LogoImage src={logoIcon} alt="" />
        <LogoText>전통주로</LogoText>
      </LogoButton>
      <IconButton aria-label="검색" onClick={() => navigate("/search")}>
        <img src={searchIcon} alt="" width={19} height={19} />
      </IconButton>
    </HeaderContainer>
  );
};

const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 16px;
`;

const LogoButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
`;

const LogoImage = styled.img`
  width: 25px;
  height: 20px;
`;

const LogoText = styled.span`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${colors.gray[900]};
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
`;
