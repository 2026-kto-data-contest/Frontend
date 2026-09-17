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
      <FilterButton type="button" onClick={() => onOpenFilter()} $active={activeCount > 0}>
        <img src={filterIcon} alt="" width={16} height={16} /> 필터
        {activeCount > 0 && <CountBadge>{activeCount}</CountBadge>}
      </FilterButton>

      {activeCount > 0 && <Divider />}

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
              <img src={removeIcon} alt="" width={16} height={16} />
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
  padding: 6px 16px 8px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid ${(props) => (props.$active ? colors.gray[900] : colors.gray[200])};
  background: #ffffff;
  font-size: 13px;
  font-weight: 700;
  line-height: 100%;
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
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background-color: ${colors.gray[900]};
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 400;
  box-sizing: border-box;
`;

const Divider = styled.div`
  flex-shrink: 0;
  width: 1px;
  height: 20px;
  background-color: ${colors.gray[200]};
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
  font-size: 13px;
  font-weight: 400;
  line-height: 100%;
  color: ${colors.gray[500]};
  cursor: pointer;
  white-space: nowrap;
`;

const ActiveChip = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 7px 11px;
  border-radius: 9999px;
  border: 1px solid transparent;
  background-color: ${colors.primary[500]};
  font-size: 13px;
  font-weight: 700;
  line-height: 100%;
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
