import { Fragment, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Chip } from "../../shared/components/Chip";
import { colors } from "../../shared/styles/colors";
import retryIcon from "../../assets/icon/Retry.svg";
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
  { key: "types", label: "주종", options: ALL_TYPE_FILTERS },
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

  useEffect(() => {
    if (open) {
      setDraft(initialFilters);
      setActiveTab(initialSection);
      // 시트가 열릴 때 선택된 섹션으로 바로 스크롤합니다. 내용 순서 자체는 항상 고정입니다.
      requestAnimationFrame(() => {
        sectionRefs.current[initialSection]?.scrollIntoView({ block: "start" });
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

  // 마지막 섹션까지도 브라우저가 스크롤 가능한 만큼만 이동시키므로, 시트 길이가 모자라도
  // 자연스럽게 마지막 필터가 하단에 맞춰지는 선에서 멈춥니다.
  const handleTabClick = (key: SectionKey) => {
    setActiveTab(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              {index > 0 && <SectionDivider />}
              <Section
                ref={(el) => {
                  sectionRefs.current[section.key] = el;
                }}
              >
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
                <span aria-hidden>×</span>
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
  border-radius: 20px 20px 0 0;
  overflow: hidden;
`;

const TabRow = styled.div`
  flex-shrink: 0;
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid ${colors.gray[100]};
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
  gap: 4px;
  padding: 14px 10px;
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 700;
  color: ${(props) => (props.$active ? colors.gray[900] : colors.gray[500])};
  border-bottom: 2px solid ${(props) => (props.$active ? colors.gray[900] : "transparent")};
  white-space: nowrap;
  cursor: pointer;
`;

const Dot = styled.span`
  width: 5px;
  height: 5px;
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

const SectionDivider = styled.div`
  flex-shrink: 0;
  height: 1px;
  background-color: ${colors.gray[100]};
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
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
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  border-top: 1px solid ${colors.gray[100]};

  &::-webkit-scrollbar {
    display: none;
  }
`;

const SelectedChip = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 9999px;
  border: 1px solid ${colors.gray[200]};
  background: ${colors.gray[50]};
  font-size: 0.8125rem;
  color: ${colors.gray[700]};
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
  width: 103px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border: 1px solid ${colors.gray[200]};
  border-radius: 8px;
  background-color: #ffffff;
  color: ${colors.gray[900]};
  font-size: 1rem;
  font-weight: 700;
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
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background-color: ${colors.primary[500]};
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background-color: #e66e00;
  }
`;
