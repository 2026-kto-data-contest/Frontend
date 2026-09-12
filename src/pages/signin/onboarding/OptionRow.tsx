import styled, { css } from "styled-components";
import { colors } from "../../../shared/styles/colors";

export interface OptionRowProps {
  icon: string;
  label: string;
  sub: string;
  active: boolean;
  indicator: "check" | "radio";
  onClick: () => void;
}

export const OptionRow = ({ icon, label, sub, active, indicator, onClick }: OptionRowProps) => {
  return (
    <Row type="button" $active={active} onClick={onClick}>
      <IconWrap $active={active}>
        <IconMask $src={icon} />
      </IconWrap>
      <TextWrap>
        <Label $active={active}>{label}</Label>
        <Sub>{sub}</Sub>
      </TextWrap>
      <Indicator $active={active} $shape={indicator} />
    </Row>
  );
};

const Row = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  border: 1.5px solid ${(props) => (props.$active ? "#ff7a00" : colors.gray[200])};
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
`;

const IconWrap = styled.span<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: ${(props) => (props.$active ? "#ff7a00" : colors.gray[700])};
`;

const IconMask = styled.span<{ $src: string }>`
  display: block;
  width: 100%;
  height: 100%;
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

const TextWrap = styled.span`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Label = styled.span<{ $active: boolean }>`
  font-size: 0.9375rem;
  font-weight: 700;
  color: ${(props) => (props.$active ? "#ff7a00" : colors.gray[900])};
`;

const Sub = styled.span`
  font-size: 0.75rem;
  color: ${colors.gray[400]};
`;

const Indicator = styled.span<{ $active: boolean; $shape: "check" | "radio" }>`
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-sizing: border-box;
  position: relative;
  border: 1.5px solid ${(props) => (props.$active ? "#ff7a00" : colors.gray[200])};
  background-color: ${(props) =>
    props.$active && props.$shape === "check" ? "#ff7a00" : "#ffffff"};

  ${(props) =>
    props.$active &&
    props.$shape === "check" &&
    css`
      &::after {
        content: "";
        position: absolute;
        left: 7px;
        top: 4px;
        width: 5px;
        height: 9px;
        border: solid #ffffff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    `}

  ${(props) =>
    props.$active &&
    props.$shape === "radio" &&
    css`
      &::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #ff7a00;
        transform: translate(-50%, -50%);
      }
    `}
`;
