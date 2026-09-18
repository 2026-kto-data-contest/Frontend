import { Fragment, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Chip } from "../../shared/components/Chip";
import { colors } from "../../shared/styles/colors";
import retryIcon from "../../assets/icon/Retry.svg";
import removeIcon from "../../assets/icon/Remove.svg";
import {
  ALL_TYPE_FILTERS,
  ALL_REGION_FILTERS,
  ALL_STRENGTH_FILTERS,
  ALL_VISIT_CONDITION_FILTERS,
  ALL_HISTORY_FILTERS,
} from "../../shared/lib/mockWineries";

export interface WineryFilters {
  types: string[];
  regions: string[];
  strengths: string[];
  visitConditions: string[];
  histories: string[];
}

export const EMPTY_FILTERS: WineryFilters = {
  types: [],
  regions: [],
  strengths: [],
  visitConditions: [],
  histories: [],
};

interface FilterSheetProps {
  open: boolean;
  initialFilters: WineryFilters;
  initialSection?: SectionKey;
  onClose: () => void;
  onApply: (filters: WineryFilters) => void;
}

export type SectionKey = "types" | "regions" | "strengths" | "visitConditions" | "histories";

export const SECTION_SHORT_LABELS: Record<SectionKey, string> = {
  types: "주종",
  regions: "지역",
  strengths: "도수",
  visitConditions: "방문조건",
  histories: "이력",
};

const SECTIONS: { key: SectionKey; label: string; options: readonly string[] }[] = [
  { key: "types", label: "주종", options: ALL_TYPE_FILTERS.filter((type) => type !== "기타") },
  { key: "regions", label: "방문지역", options: ALL_REGION_FILTERS },
  { key: "strengths", label: "선호도수", options: ALL_STRENGTH_FILTERS },
  { key: "visitConditions", label: "방문조건", options: ALL_VISIT_CONDITION_FILTERS },
  { key: "histories", label: "이력", options: ALL_HISTORY_FILTERS },
];

export const FilterSheet = ({
  open,
  initialFilters,
  initialSection = "types",
  onClose,
  onApply,
}: FilterSheetProps) => {
  const [draft, setDraft] = useState<WineryFilters>(initialFilters);
  const [activeTab, setActiveTab] = useState<SectionKey>(initialSection);
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    types: null,
    regions: null,
    strengths: null,
    visitConditions: null,
    histories: null,
  });
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (key: SectionKey) => {
    // 첫 섹션(주종)은 위쪽에 구분선이 없으므로, 섹션으로 scrollIntoView하면 Content의
    // 상단 패딩까지 접혀버려 진짜 맨 위(scrollTop 0)까지 올라가지 않습니다. 이 경우엔
    // Content 자체를 맨 위로 스크롤합니다.
    if (key === SECTIONS[0].key) {
      contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    sectionRefs.current[key]?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  useEffect(() => {
    if (open) {
      setDraft(initialFilters);
      setActiveTab(initialSection);
      // 시트가 열릴 때 선택된 섹션으로 바로 스크롤합니다. 내용 순서 자체는 항상 고정입니다.
      requestAnimationFrame(() => {
        scrollToSection(initialSection);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSection]);

  if (!open) return null;

  const toggle = (key: SectionKey, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  };

  const handleTabClick = (key: SectionKey) => {
    setActiveTab(key);
    scrollToSection(key);
  };

  const selectedEntries = SECTIONS.flatMap((section) =>
    draft[section.key].map((value) => ({ section: section.key, value }))
  );

  const removeSelected = (key: SectionKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: prev[key].filter((item) => item !== value) }));
  };

  const resetDraft = () => setDraft(EMPTY_FILTERS);

  return (
    <Overlay onClick={onClose}>
      <Sheet onClick={(e) => e.stopPropagation()}>
        <HandleArea>
          <HandleBar />
        </HandleArea>
        <TabRow>
          {SECTIONS.map((section) => (
            <TabButton
              key={section.key}
              type="button"
              $active={activeTab === section.key}
              onClick={() => handleTabClick(section.key)}
            >
              {section.label}
              {draft[section.key].length > 0 && <Dot />}
            </TabButton>
          ))}
        </TabRow>

        <Content ref={contentRef}>
          {SECTIONS.map((section, index) => (
            <Fragment key={section.key}>
              {index > 0 && (
                <SectionDivider
                  ref={(el) => {
                    sectionRefs.current[section.key] = el;
                  }}
                />
              )}
              <Section>
                <SectionTitle>{section.label}</SectionTitle>
                <ChipGrid>
                  {section.options.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      active={draft[section.key].includes(option)}
                      onClick={() => toggle(section.key, option)}
                    />
                  ))}
                </ChipGrid>
              </Section>
            </Fragment>
          ))}
          <ScrollSpacer aria-hidden />
        </Content>

        {selectedEntries.length > 0 && (
          <SelectedRow>
            {selectedEntries.map(({ section, value }) => (
              <SelectedChip
                key={`${section}-${value}`}
                type="button"
                onClick={() => removeSelected(section, value)}
              >
                {value}
                <img src={removeIcon} alt="" width={16} height={16} />
              </SelectedChip>
            ))}
          </SelectedRow>
        )}

        <Footer>
          <ResetButton type="button" onClick={resetDraft}>
            <ResetIcon aria-hidden /> 초기화
          </ResetButton>
          <ApplyButton
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            적용하기
          </ApplyButton>
        </Footer>
      </Sheet>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.4);
`;

const Sheet = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  height: 620px;
  max-height: 92%;
  background-color: #ffffff;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
`;

const HandleArea = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
`;

const HandleBar = styled.div`
  width: 36px;
  height: 4px;
  border-radius: 9999px;
  background-color: ${colors.gray[200]};
`;

const TabRow = styled.div`
  flex-shrink: 0;
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid ${colors.border};
  padding: 0 16px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px;
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.32px;
  color: ${(props) => (props.$active ? colors.gray[900] : colors.gray[500])};
  border-bottom: 2px solid ${(props) => (props.$active ? colors.gray[900] : "transparent")};
  white-space: nowrap;
  cursor: pointer;
`;

const Dot = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${colors.primary[500]};
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px 16px 16px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// Content 높이가 필터 목록 전체보다 커서, 탭으로 뒤쪽 섹션(방문조건/이력)에 스크롤해도
// 스크롤 여유가 부족해 해당 섹션이 상단까지 올라오지 못하는 문제를 막기 위한 여백입니다.
const ScrollSpacer = styled.div`
  flex-shrink: 0;
  width: 1px;
  height: 420px;
`;

const SectionDivider = styled.div`
  flex-shrink: 0;
  height: 1px;
  background-color: ${colors.divider};
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 140%;
  letter-spacing: -0.28px;
  color: ${colors.gray[500]};
`;

const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const SelectedRow = styled.div`
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  padding: 10px 16px;
  overflow-x: auto;
  background-color: ${colors.gray[50]};
  border-bottom: 1px solid ${colors.divider};

  &::-webkit-scrollbar {
    display: none;
  }
`;

const SelectedChip = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid ${colors.gray[200]};
  background: #ffffff;
  font-size: 0.8125rem;
  line-height: 100%;
  color: ${colors.gray[500]};
  white-space: nowrap;
  cursor: pointer;
`;

const Footer = styled.div`
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  padding: 12px 16px 40px;
`;

const ResetButton = styled.button`
  flex-shrink: 0;
  height: 48px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  background-color: transparent;
  color: ${colors.gray[900]};
  font-size: 1rem;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.32px;
  white-space: nowrap;
  cursor: pointer;
`;

const ResetIcon = styled.span`
  flex-shrink: 0;
  display: inline-block;
  width: 24px;
  height: 24px;
  background-color: ${colors.gray[900]};
  -webkit-mask-image: url("${retryIcon}");
  mask-image: url("${retryIcon}");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
`;

const ApplyButton = styled.button`
  flex: 1;
  height: 48px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background-color: ${colors.primary[500]};
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  line-height: 140%;
  letter-spacing: -0.32px;
  cursor: pointer;

  &:hover {
    background-color: #e66e00;
  }
`;
