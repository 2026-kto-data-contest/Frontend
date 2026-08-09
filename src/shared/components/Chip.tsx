import React from "react";
import styled, { css } from "styled-components";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 칩에 표시될 텍스트 */
  label: string;
  /** 활성화(Selected) 상태 여부 */
  active?: boolean;
  /** 삭제/취소 가능한 칩 여부 */
  deletable?: boolean;
  /** 취소 버튼(X) 클릭 시 호출되는 함수 */
  onDelete?: (e: React.MouseEvent<HTMLSpanElement>) => void;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  active = false,
  deletable = false,
  onDelete,
  onClick,
  children,
  ...props
}) => {
  const handleDeleteClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation(); // Chip 전체 클릭 이벤트와 중복 발생 방지
    onDelete?.(e);
  };

  return (
    <StyledChip $active={active} onClick={onClick} {...props}>
      <Label>{label}</Label>
      {deletable && (
        <DeleteButton
          role="button"
          tabIndex={0}
          aria-label="Delete chip"
          onClick={handleDeleteClick}
        >
          ✕
        </DeleteButton>
      )}
    </StyledChip>
  );
};

interface StyledChipProps {
  $active?: boolean;
}

const StyledChip = styled.button<StyledChipProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 9999px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
  user-select: none;
  transition: all 0.2s ease-in-out;

  background-color: #ffffff;
  color: #4a5568;
  border: 1px solid #e2e8f0;

  &:hover {
    background-color: #f7fafc;
  }

  ${({ $active }) =>
    $active &&
    css`
      background-color: #ff7a00;
      color: #ffffff;
      border-color: transparent;

      &:hover {
        background-color: #e66e00;
      }
    `}
`;

const Label = styled.span`
  display: inline-block;
`;

const DeleteButton = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 2px;
  font-size: 12px;
  color: inherit;
  opacity: 0.7;
  border-radius: 50%;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.08);
  }
`;
