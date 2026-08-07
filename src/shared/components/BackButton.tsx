import styled, { css } from "styled-components";
import backIcon from "../../assets/icon/Back.svg";

export interface BackButtonProps {
  onClick: () => void;
  onDark?: boolean;
}

export const BackButton = ({ onClick, onDark = false }: BackButtonProps) => {
  return (
    <StyledButton type="button" aria-label="뒤로가기" onClick={onClick} $onDark={onDark}>
      <Icon src={backIcon} alt="" $onDark={onDark} />
    </StyledButton>
  );
};

const StyledButton = styled.button<{ $onDark: boolean }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;

  ${(props) =>
    props.$onDark &&
    css`
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 1;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.3);
    `}
`;

const Icon = styled.img<{ $onDark: boolean }>`
  width: 8px;
  height: 15px;
  ${(props) =>
    props.$onDark &&
    css`
      filter: brightness(0) invert(1);
    `}
`;
