import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePersistentState, useLocalStorageState } from "../../../shared/lib/pageState";
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

const ANY_OPTION = TASTE_OPTIONS.find((option) => option.id === "any")!;

// 백엔드는 liquorTypes 값으로 실제 주종명만 허용합니다("추천받기" 같은 문구는 저장 시
// 거부됨). "전부 다 취급해달라"는 의미는 백엔드가 실제 주종 다섯 가지(기타 제외)를 받아
// 자기 추천 로직에서 처리하므로, 프론트는 저장용 값만 이렇게 채워 보냅니다.
const ANY_LIQUOR_TYPES = ALL_TYPE_FILTERS.filter((type) => type !== "기타");

/** 선택한 취향 옵션 id들을 저장용 주종 문자열 목록으로 바꿉니다("어떤 맛이든 좋아요"는 다섯 가지로 채움). */
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

/**
 * 화면에 보여줄 문구는 저장값과 다릅니다("어떤 맛이든 좋아요"를 실제 주종으로 부풀리지
 * 않고, 고른 그대로 "과실주·추천받기"처럼 보여줌). 저장에 쓰는 백엔드 주종 목록과
 * 달리, 고른 것을 그대로 반영해야 해서 로컬(브라우저)에 따로 기억해둡니다.
 */
export function deriveTasteDisplayLabel(selectedIds: string[]): string {
  return Array.from(
    new Set(
      TASTE_OPTIONS.filter((option) => selectedIds.includes(option.id)).map(
        (option) => option.type || ANY_OPTION.sub
      )
    )
  ).join("·");
}

const TASTE_DISPLAY_LABEL_KEY = "onboarding:tasteDisplayLabel";

/** 마이페이지 등에서 저장된 취향을 고른 그대로("추천받기" 포함) 보여줄 때 씁니다. */
export function useTasteDisplayLabel() {
  return useLocalStorageState<string | null>(TASTE_DISPLAY_LABEL_KEY, null);
}

export default function OnboardingTastePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";
  const isEditMode = from === "/mypage";
  const [selected, setSelected] = usePersistentState<string[]>("onboarding:taste", []);
  const [tasteDisplayLabel, setTasteDisplayLabel] = useTasteDisplayLabel();
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
        // 실제 고른 조합(예: 과실주+추천받기)은 저장값(백엔드용으로 부풀린 실제 주종
        // 목록)만으로는 되살릴 수 없어서, 로컬에 기억해둔 화면 문구를 우선 씁니다.
        // 그게 없으면(다른 기기 등) 저장된 주종과 겹치는 항목으로 최대한 복원합니다.
        const matchedIds = tasteDisplayLabel
          ? TASTE_OPTIONS.filter((option) =>
              tasteDisplayLabel.split("·").includes(option.type || ANY_OPTION.sub)
            ).map((option) => option.id)
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
    if (result.success) {
      setTasteDisplayLabel(deriveTasteDisplayLabel(selected));
    } else {
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
