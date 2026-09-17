import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import searchIcon from "../../assets/icon/Search.svg";

interface HeaderProps {
  /** 어두운 배경(로그인 화면 등) 위에서 로고가 보이도록 흰색으로 렌더링합니다. */
  onDark?: boolean;
  /** 로고 아이콘·워드마크 크기 배율입니다. 기본 1(원래 크기). */
  logoScale?: number;
}

export const Header = ({ onDark = false, logoScale = 1 }: HeaderProps = {}) => {
  const navigate = useNavigate();
  const logoFill = onDark ? "#FFFFFF" : "#171716";

  return (
    <HeaderContainer>
      <LogoButton type="button" aria-label="홈으로 이동" onClick={() => navigate("/")}>
        <LogoIcon
          $scale={logoScale}
          aria-hidden
          viewBox="0 0 33 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#header-logo-filter0)">
            <circle cx="3.40626" cy="21.5225" r="2.78712" fill="#FF8A00" />
          </g>
          <g filter="url(#header-logo-filter1)">
            <path
              d="M22.2051 0.30957C24.5345 0.309649 26.4775 2.15188 26.4775 4.49023C26.4775 6.82862 24.5345 8.67082 22.2051 8.6709H4.90137L4.67969 8.68164C3.59002 8.78808 2.7873 9.67201 2.78711 10.6836C2.78714 11.7627 3.70069 12.6973 4.90137 12.6973H22.9951C24.0162 12.6972 24.9189 12.6957 25.6279 12.8164C26.409 12.9495 27.1491 13.2612 27.6465 14.0234C28.082 14.691 28.2276 15.5636 28.2969 16.5195C28.3682 17.5032 28.3682 18.796 28.3682 20.4385H30.3486C30.947 20.4386 31.4325 20.9241 31.4326 21.5225C31.4326 22.121 30.9471 22.6063 30.3486 22.6064H9.44531C8.84672 22.6064 8.36136 22.121 8.36133 21.5225C8.36149 20.924 8.8468 20.4385 9.44531 20.4385H26.2002C26.2002 18.7621 26.1991 17.5627 26.1348 16.6758C26.0679 15.7543 25.94 15.3751 25.8311 15.208C25.7839 15.1357 25.7077 15.0288 25.2637 14.9531C24.7632 14.8679 24.0558 14.8643 22.9268 14.8643H4.90137C2.56969 14.8643 0.619171 13.0251 0.619141 10.6836C0.619339 8.41017 2.45804 6.61031 4.69922 6.50781C4.73318 6.50461 4.76794 6.50293 4.80273 6.50293H22.2051C23.3972 6.50285 24.3095 5.57234 24.3096 4.49023C24.3095 3.40816 23.3972 2.47762 22.2051 2.47754H2.0127C1.41415 2.47748 0.928741 1.9921 0.928711 1.39355C0.928711 0.79498 1.41413 0.30963 2.0127 0.30957H22.2051Z"
              fill={logoFill}
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
              <feMorphology
                radius="0.30968"
                operator="erode"
                in="SourceAlpha"
                result="effect2_innerShadow"
              />
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
        <LogoWordmark
          $scale={logoScale}
          aria-hidden
          viewBox="0 0 79 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9.98404 11.7892C8.93661 10.296 7.82232 9.1149 6.46288 8.11203C5.46002 9.64976 3.94459 11.0315 1.89429 12.1235L0 10.2069C3.38744 8.58004 4.79145 6.1286 4.83602 3.47659H1.00286V0.980575H11.6109V3.47659H7.91146C7.91146 4.25659 7.77775 5.03659 7.55489 5.79431C9.38233 6.88632 10.8755 8.24575 12.2795 9.98404L9.98404 11.7892ZM17.2269 14.6195H14.2852V7.15375H11.1429V4.52402H14.2852V0H17.2269V14.6195ZM17.7841 19.6561C15.7784 19.7675 13.9732 19.8121 12.3018 19.8121C10.7418 19.8121 9.31547 19.7675 8.00061 19.6784C5.9726 19.5447 4.81374 18.8538 4.32345 17.4498C3.9223 16.2686 3.81087 14.6641 3.87773 13.1041L6.81946 13.0595C6.79717 14.0401 6.88632 15.2212 7.08689 16.0012C7.28746 16.7812 7.77775 17.0932 8.80289 17.1824C9.67204 17.2492 10.764 17.2938 12.0121 17.2938C13.6166 17.2938 15.5332 17.2269 17.6058 17.1155L17.7841 19.6561Z"
            fill={logoFill}
          />
          <path
            d="M34.9772 16.7589C34.9772 18.9652 33.0161 20.7927 29.1829 20.7927C25.3498 20.7927 23.3886 18.9652 23.3886 16.7589C23.3886 14.5526 25.3498 12.7252 29.1829 12.7252C33.0161 12.7252 34.9772 14.5526 34.9772 16.7589ZM38.5875 12.2349H19.7783V9.82804H27.7789V8.82518C26.7761 8.82518 25.8623 8.80289 25.0823 8.75832C22.9429 8.64689 22.0069 7.91146 21.9623 5.63831C21.94 4.16745 22.0292 2.20629 22.1406 0.490288H36.3144V2.80801H24.9709C24.9709 3.00858 24.9486 3.23144 24.9486 3.4543H36.2029V5.63831H24.9263V5.74974C24.9486 6.17317 25.2383 6.39603 25.6395 6.41831C26.7538 6.48517 28.2469 6.52974 29.8738 6.52974C31.9909 6.52974 34.3532 6.46289 36.4704 6.32917L36.5818 8.66918C34.6652 8.73604 32.6818 8.80289 30.8098 8.82518V9.82804H38.5875V12.2349ZM32.0132 16.7589C32.0132 15.9344 31.0549 15.2212 29.1829 15.2212C27.3109 15.2212 26.3526 15.9344 26.3526 16.7589C26.3526 17.5835 27.3109 18.2966 29.1829 18.2966C31.0549 18.2966 32.0132 17.5835 32.0132 16.7589Z"
            fill={logoFill}
          />
          <path
            d="M42.0303 3.47659V0.891433H56.2933V3.47659H50.6995C50.6549 4.03373 50.5212 4.56859 50.2984 5.08116C52.5938 5.79431 54.8001 6.84174 57.1847 8.37946L55.3795 10.4743C53.2401 9.02575 51.3012 7.95603 48.9167 7.0646C47.3121 8.66918 44.8161 9.85033 42.1641 10.4743L41.0275 8.26804C44.7938 7.44346 47.2898 5.63831 47.5795 3.47659H42.0303ZM50.6772 20.1909H47.6464V14.3743H39.7572V11.7892H58.5664V14.3743H50.6772V20.1909Z"
            fill={logoFill}
          />
          <path
            d="M78.5453 18.1852H59.7361V15.6001H67.6252V13.1263C66.8452 13.1041 66.0875 13.0595 65.3967 13.0149C63.3464 12.8589 62.0984 11.8783 62.0315 9.78347C61.9869 8.62461 62.0538 7.10917 62.1875 5.72745L73.1298 5.68288V3.65487H62.1206V1.11429H75.0018C75.8264 1.11429 76.1607 1.44858 76.1607 2.27315V8.08975L65.1292 8.13432C65.0624 8.53547 65.0401 9.04804 65.0847 9.49376C65.1292 9.98404 65.5972 10.3629 66.2212 10.4298C67.4247 10.5412 68.7395 10.608 70.1213 10.608C72.1938 10.608 74.4001 10.4743 76.5396 10.2292L76.7179 12.7921C74.8236 12.9926 72.7064 13.1263 70.6561 13.1486V15.6001H78.5453V18.1852Z"
            fill={logoFill}
          />
        </LogoWordmark>
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

const LogoIcon = styled.svg<{ $scale: number }>`
  width: ${(props) => 30.813 * props.$scale}px;
  height: ${(props) => 24 * props.$scale}px;
  flex-shrink: 0;
`;

const LogoWordmark = styled.svg<{ $scale: number }>`
  width: ${(props) => 68.545 * props.$scale}px;
  height: ${(props) => 20.793 * props.$scale}px;
  flex-shrink: 0;
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
