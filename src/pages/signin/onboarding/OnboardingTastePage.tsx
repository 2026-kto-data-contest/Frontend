import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePersistentState } from "../../../shared/lib/pageState";
import { Button } from "../../../shared/components/Button";
import { OnboardingLayout } from "./OnboardingLayout";
import { OptionRow } from "./OptionRow";
import { finishOnboarding, saveOnboardingPreferenceField } from "./finishOnboarding";
import { fetchOnboardingPreferences } from "../../../shared/api/api";
import type { OnboardingPreferencesData } from "../../../shared/api/api";
import { ALL_TYPE_FILTERS } from "../../../shared/lib/mockWineries";
import sweetIcon from "../../../assets/icon/Sweet.svg";
import nuttyIcon from "../../../assets/icon/Nutty.svg";
import cleanIcon from "../../../assets/icon/Clean.svg";
import heavyIcon from "../../../assets/icon/Heavy.svg";
import whateverIcon from "../../../assets/icon/Whatever.svg";

export interface TasteOption {
  id: string;
  label: string;
  sub: string;
  type: string;
  tag: string;
}

export const TASTE_OPTIONS: TasteOption[] = [
  { id: "fruity", label: "달콤하고 상큼한", sub: "과실주", type: "과실주", tag: "상큼함" },
  { id: "makgeolli", label: "고소하고 부드러운", sub: "막걸리", type: "탁주", tag: "부드러움" },
  { id: "clean", label: "깔끔하고 담백한", sub: "약주·청주", type: "청주", tag: "깔끔함" },
  { id: "strong", label: "묵직하고 드라이한", sub: "증류주", type: "증류주", tag: "묵직함" },
  { id: "any", label: "어떤 맛이든 좋아요", sub: "추천받기", type: "", tag: "" },
];

const ICONS: Record<string, string> = {
  fruity: sweetIcon,
  makgeolli: nuttyIcon,
  clean: cleanIcon,
  strong: heavyIcon,
  any: whateverIcon,
};

// "어떤 맛이든 좋아요"를 고르면 마이페이지에는 실제 주종 다섯 가지(기타 제외)를
// 다 고른 것처럼 보여줍니다.
const ANY_LIQUOR_TYPES = ALL_TYPE_FILTERS.filter((type) => type !== "기타");

/** 저장된 주종이 "어떤 맛이든 좋아요"를 선택했을 때 저장되는 다섯 가지를 전부 포함하는지 봅니다. */
export function isAnyFlavorPreference(liquorTypes: string[]): boolean {
  return ANY_LIQUOR_TYPES.every((type) => liquorTypes.includes(type));
}

/** 선택한 취향 옵션 id들을 저장용 주종 문자열 목록으로 바꿉니다. */
export function deriveLiquorTypes(selectedIds: string[]): string[] {
  if (selectedIds.includes("any")) return [...ANY_LIQUOR_TYPES];
  return Array.from(
    new Set(
      TASTE_OPTIONS.filter((option) => selectedIds.includes(option.id) && option.type).map(
        (option) => option.type
      )
    )
  );
}

export default function OnboardingTastePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";
  const isEditMode = from === "/mypage";
  const [selected, setSelected] = usePersistentState<string[]>("onboarding:taste", []);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [otherPreferences, setOtherPreferences] = useState<OnboardingPreferencesData | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode) return;
    let cancelled = false;
    fetchOnboardingPreferences()
      .then((preferences) => {
        if (cancelled) return;
        setOtherPreferences(preferences);
        // 저장된 주종이 "어떤 맛이든 좋아요"가 채워 넣는 다섯 가지를 전부 포함하면,
        // 온보딩 화면에서는 구체적인 다섯 항목이 아니라 "어떤 맛이든 좋아요" 하나만
        // 선택된 것으로 되돌립니다.
        const matchedIds = isAnyFlavorPreference(preferences.liquorTypes)
          ? ["any"]
          : TASTE_OPTIONS.filter(
              (option) => option.type && preferences.liquorTypes.includes(option.type)
            ).map((option) => option.id);
        setSelected(matchedIds);
      })
      .catch((error) => console.error("취향 정보 조회 실패", error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSkip = async () => {
    if (isSkipping) return;
    setIsSkipping(true);
    setSkipError(null);
    const result = await finishOnboarding(navigate, from);
    if (!result.success) {
      setSkipError(result.message ?? null);
    }
    setIsSkipping(false);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    const result = await saveOnboardingPreferenceField(navigate, from, {
      liquorTypes: deriveLiquorTypes(selected),
      regions: otherPreferences?.regions ?? [],
      alcoholLevel: otherPreferences?.alcoholLevel ?? "MEDIUM",
    });
    if (!result.success) {
      setSaveError(result.message ?? null);
    }
    setIsSaving(false);
  };

  return (
    <OnboardingLayout
      step={1}
      title={
        <>
          어떤 맛의 술을
          <br />
          좋아하세요?
        </>
      }
      subtitle="마음에 드는 맛을 모두 골라주세요."
      onBack={() => (isEditMode ? navigate(from) : navigate(-1))}
      onSkip={isEditMode ? undefined : handleSkip}
      showProgress={!isEditMode}
      error={isEditMode ? saveError : skipError}
      footer={
        <Button
          variant="primary"
          size="lg"
          disabled={selected.length === 0 || (isEditMode && isSaving)}
          style={{ width: "100%", height: 48, borderRadius: 8 }}
          onClick={
            isEditMode
              ? handleSave
              : () => navigate(`/onboarding/region?from=${encodeURIComponent(from)}`)
          }
        >
          {isEditMode ? (isSaving ? "저장 중..." : "완료") : "다음"}
        </Button>
      }
    >
      <RowList>
        {TASTE_OPTIONS.map((option) => (
          <OptionRow
            key={option.id}
            icon={ICONS[option.id]}
            label={option.label}
            sub={option.sub}
            active={selected.includes(option.id)}
            indicator="check"
            onClick={() => toggle(option.id)}
          />
        ))}
      </RowList>
    </OnboardingLayout>
  );
}

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
