import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import searchIcon from "../../assets/icon/Search.svg";
import { colors } from "../styles/colors";

export const Header = () => {
  const navigate = useNavigate();

  return (
    <HeaderContainer>
      <LogoButton type="button" aria-label="홈으로 이동" onClick={() => navigate("/")}>
        <LogoIcon aria-hidden viewBox="0 0 33 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#header-logo-filter0)">
            <circle cx="3.40626" cy="21.5225" r="2.78712" fill="#FF8A00" />
          </g>
          <g filter="url(#header-logo-filter1)">
            <path
              d="M22.2051 0.30957C24.5345 0.309649 26.4775 2.15188 26.4775 4.49023C26.4775 6.82862 24.5345 8.67082 22.2051 8.6709H4.90137L4.67969 8.68164C3.59002 8.78808 2.7873 9.67201 2.78711 10.6836C2.78714 11.7627 3.70069 12.6973 4.90137 12.6973H22.9951C24.0162 12.6972 24.9189 12.6957 25.6279 12.8164C26.409 12.9495 27.1491 13.2612 27.6465 14.0234C28.082 14.691 28.2276 15.5636 28.2969 16.5195C28.3682 17.5032 28.3682 18.796 28.3682 20.4385H30.3486C30.947 20.4386 31.4325 20.9241 31.4326 21.5225C31.4326 22.121 30.9471 22.6063 30.3486 22.6064H9.44531C8.84672 22.6064 8.36136 22.121 8.36133 21.5225C8.36149 20.924 8.8468 20.4385 9.44531 20.4385H26.2002C26.2002 18.7621 26.1991 17.5627 26.1348 16.6758C26.0679 15.7543 25.94 15.3751 25.8311 15.208C25.7839 15.1357 25.7077 15.0288 25.2637 14.9531C24.7632 14.8679 24.0558 14.8643 22.9268 14.8643H4.90137C2.56969 14.8643 0.619171 13.0251 0.619141 10.6836C0.619339 8.41017 2.45804 6.61031 4.69922 6.50781C4.73318 6.50461 4.76794 6.50293 4.80273 6.50293H22.2051C23.3972 6.50285 24.3095 5.57234 24.3096 4.49023C24.3095 3.40816 23.3972 2.47762 22.2051 2.47754H2.0127C1.41415 2.47748 0.928741 1.9921 0.928711 1.39355C0.928711 0.79498 1.41413 0.30963 2.0127 0.30957H22.2051Z"
              fill="#171716"
            />
          </g>
          <defs>
            <filter
              id="header-logo-filter0"
              x="-0.000219762"
              y="18.2708"
              width="6.81294"
              height="6.81294"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="0.15484" />
              <feGaussianBlur stdDeviation="0.30968" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feMorphology radius="0.30968" operator="erode" in="SourceAlpha" result="effect2_innerShadow" />
              <feOffset />
              <feGaussianBlur stdDeviation="0.929041" />
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0" />
              <feBlend mode="normal" in2="shape" result="effect2_innerShadow" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset />
              <feGaussianBlur stdDeviation="0.929041" />
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
              <feBlend mode="normal" in2="effect2_innerShadow" result="effect3_innerShadow" />
            </filter>
            <filter
              id="header-logo-filter1"
              x="-0.000219762"
              y="-0.000109881"
              width="32.0522"
              height="23.5356"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="0.30968" />
              <feGaussianBlur stdDeviation="0.30968" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="0.30968" />
              <feGaussianBlur stdDeviation="0.46452" />
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
              <feBlend mode="normal" in2="shape" result="effect2_innerShadow" />
            </filter>
          </defs>
        </LogoIcon>
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

const LogoIcon = styled.svg`
  width: 30.813px;
  height: 24px;
  flex-shrink: 0;
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
