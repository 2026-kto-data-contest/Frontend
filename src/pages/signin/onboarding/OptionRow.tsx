import styled from "styled-components";
import { colors } from "../../../shared/styles/colors";
import optionCheckedIcon from "../../../assets/icon/OptionCheckedIcon.svg";
import optionRadioIcon from "../../../assets/icon/OptionRadioIcon.svg";

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
        <Sub $active={active}>{sub}</Sub>
      </TextWrap>
      {active && (
        <img
          src={indicator === "check" ? optionCheckedIcon : optionRadioIcon}
          alt=""
          width={24}
          height={24}
        />
      )}
    </Row>
  );
};

const Row = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid ${(props) => (props.$active ? colors.primary[700] : colors.divider)};
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
  color: ${(props) => (props.$active ? colors.primary[500] : colors.gray[900])};
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
  font-size: 1rem;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${(props) => (props.$active ? colors.primary[500] : colors.gray[900])};
`;

const Sub = styled.span<{ $active: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.$active ? colors.primary[500] : colors.gray[400])};
`;
