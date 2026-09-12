import styled from "styled-components";
import { colors } from "../../shared/styles/colors";
import { SECTION_SHORT_LABELS } from "./FilterSheet";
import type { SectionKey, WineryFilters } from "./FilterSheet";
import filterIcon from "../../assets/icon/Filter.svg";
import downArrowIcon from "../../assets/icon/DownArrow.svg";
import removeIcon from "../../assets/icon/Remove.svg";

const CATEGORY_ORDER: SectionKey[] = [
  "types",
  "regions",
  "strengths",
  "visitConditions",
  "histories",
];

export interface FilterBarProps {
  filters: WineryFilters;
  /** 활성 카테고리가 앞으로 오도록, 최근 적용된 순서대로 정렬된 카테고리 키 목록 */
  filterOrder: SectionKey[];
  activeCount: number;
  onOpenFilter: (section?: SectionKey) => void;
  onClearCategory: (key: SectionKey) => void;
}

export const FilterBar = ({
  filters,
  filterOrder,
  activeCount,
  onOpenFilter,
  onClearCategory,
}: FilterBarProps) => {
  const inactiveKeys = CATEGORY_ORDER.filter((key) => !filterOrder.includes(key));
  const orderedKeys = [...filterOrder, ...inactiveKeys];

  return (
    <Row>
      <FilterButton type="button" onClick={() => onOpenFilter()}>
        <img src={filterIcon} alt="" width={16} height={16} /> 필터
        {activeCount > 0 && <CountBadge>{activeCount}</CountBadge>}
      </FilterButton>

      {orderedKeys.map((key) => {
        const count = filters[key].length;
        if (count === 0) {
          return (
            <DropdownButton key={key} type="button" onClick={() => onOpenFilter(key)}>
              {SECTION_SHORT_LABELS[key]} <img src={downArrowIcon} alt="" width={12} height={12} />
            </DropdownButton>
          );
        }
        return (
          <ActiveChip key={key} type="button" onClick={() => onOpenFilter(key)}>
            {SECTION_SHORT_LABELS[key]} {count}
            <ClearIcon
              aria-label={`${SECTION_SHORT_LABELS[key]} 필터 지우기`}
              onClick={(e) => {
                e.stopPropagation();
                onClearCategory(key);
              }}
            >
              <img src={removeIcon} alt="" width={14} height={14} />
            </ClearIcon>
          </ActiveChip>
        );
      })}
    </Row>
  );
};

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 12px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const FilterButton = styled.button`
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid ${colors.gray[900]};
  background: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${colors.gray[900]};
  cursor: pointer;
`;

const CountBadge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9999px;
  border: 2px solid #ffffff;
  background-color: ${colors.gray[900]};
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 700;
  box-sizing: border-box;
`;

const DropdownButton = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid ${colors.gray[200]};
  background: #ffffff;
  font-size: 0.8125rem;
  color: ${colors.gray[600]};
  cursor: pointer;
  white-space: nowrap;
`;

const ActiveChip = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 8px 12px;
  border-radius: 9999px;
  border: 1px solid transparent;
  background-color: #ff7a00;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  white-space: nowrap;
`;

const ClearIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;

  img {
    filter: brightness(0) invert(1);
  }
`;
