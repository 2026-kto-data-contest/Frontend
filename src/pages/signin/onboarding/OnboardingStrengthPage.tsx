import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../shared/lib/authContext";
import { usePersistentState } from "../../../shared/lib/pageState";
import { Button } from "../../../shared/components/Button";
import { OnboardingLayout } from "./OnboardingLayout";
import { OptionRow } from "./OptionRow";
import {
  finishOnboarding,
  finishOnboardingWithPreferences,
  saveOnboardingPreferenceField,
} from "./finishOnboarding";
import { deriveLiquorTypes, deriveTasteDisplayLabel, useTasteDisplayLabel } from "./OnboardingTastePage";
import { REAL_REGIONS } from "./OnboardingRegionPage";
import { ALL_TYPE_FILTERS } from "../../../shared/lib/mockWineries";
import { fetchOnboardingPreferences } from "../../../shared/api/api";
import type { AlcoholLevel, OnboardingPreferencesData } from "../../../shared/api/api";
import lightIcon from "../../../assets/icon/Light.svg";
import halfIcon from "../../../assets/icon/Half.svg";
import hardIcon from "../../../assets/icon/Hard.svg";

const ALCOHOL_LEVEL_MAP: Record<string, AlcoholLevel> = {
  light: "LIGHT",
  medium: "MEDIUM",
  strong: "STRONG",
};

export const ALCOHOL_LEVEL_TO_ID: Record<AlcoholLevel, string> = {
  LIGHT: "light",
  MEDIUM: "medium",
  STRONG: "strong",
};

export const STRENGTH_OPTIONS = [
  { id: "light", label: "가볍게", sub: "14도 이하" },
  { id: "medium", label: "적당히", sub: "15도 이상 29도 미만" },
  { id: "strong", label: "독하게", sub: "30도 이상" },
];

const ICONS: Record<string, string> = {
  light: lightIcon,
  medium: halfIcon,
  strong: hardIcon,
};

export default function OnboardingStrengthPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";
  const isEditMode = from === "/mypage";
  const [selectedTaste] = usePersistentState<string[]>("onboarding:taste", []);
  const [, setTasteDisplayLabel] = useTasteDisplayLabel();
  const [selectedRegion] = usePersistentState<string[]>("onboarding:region", []);
  const [selectedStrength, setSelectedStrength] = usePersistentState<string>(
    "onboarding:strength",
    ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [otherPreferences, setOtherPreferences] = useState<OnboardingPreferencesData | null>(
    null
  );

  useEffect(() => {
    if (!isEditMode) return;
    let cancelled = false;
    fetchOnboardingPreferences()
      .then((preferences) => {
        if (cancelled) return;
        setOtherPreferences(preferences);
        setSelectedStrength(ALCOHOL_LEVEL_TO_ID[preferences.alcoholLevel] ?? "");
      })
      .catch((error) => console.error("취향 정보 조회 실패", error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    // "전국"으로 전 지역을 선택한 경우, 백엔드 규약대로 빈 배열을 보내 전국 취급이 되게 합니다.
    const isNationwide = REAL_REGIONS.every((region) => selectedRegion.includes(region));
    const regions = isNationwide ? [] : selectedRegion;

    const result = await finishOnboardingWithPreferences(auth, navigate, from, {
      liquorTypes: deriveLiquorTypes(selectedTaste),
      regions,
      alcoholLevel: ALCOHOL_LEVEL_MAP[selectedStrength] ?? "MEDIUM",
    });
    if (result.success) {
      setTasteDisplayLabel(deriveTasteDisplayLabel(selectedTaste));
    } else {
      setErrorMessage(result.message ?? null);
    }
    setIsSubmitting(false);
  };

  const handleSkip = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await finishOnboarding(navigate, from);
    if (!result.success) {
      setErrorMessage(result.message ?? null);
    }
    setIsSubmitting(false);
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await saveOnboardingPreferenceField(navigate, from, {
      liquorTypes: otherPreferences?.liquorTypes ?? [...ALL_TYPE_FILTERS],
      regions: otherPreferences?.regions ?? [],
      alcoholLevel: ALCOHOL_LEVEL_MAP[selectedStrength] ?? "MEDIUM",
    });
    if (!result.success) {
      setErrorMessage(result.message ?? null);
    }
    setIsSubmitting(false);
  };

  return (
    <OnboardingLayout
      step={3}
      title={
        <>
          평소 어느 정도 도수의
          <br />
          술을 즐기세요?
        </>
      }
      subtitle="가장 가까운 항목 하나를 골라 주세요."
      onBack={() =>
        isEditMode
          ? navigate(from)
          : navigate(`/onboarding/region?from=${encodeURIComponent(from)}`)
      }
      onSkip={isEditMode ? undefined : handleSkip}
      showProgress={!isEditMode}
      error={errorMessage}
      footer={
        <Button
          variant="primary"
          size="lg"
          disabled={!selectedStrength || isSubmitting}
          style={{ width: "100%", height: 48, borderRadius: 8 }}
          onClick={isEditMode ? handleSave : handleFinish}
        >
          {isSubmitting ? "저장 중..." : "완료"}
        </Button>
      }
    >
      <RowList>
        {STRENGTH_OPTIONS.map((option) => (
          <OptionRow
            key={option.id}
            icon={ICONS[option.id]}
            label={option.label}
            sub={option.sub}
            active={selectedStrength === option.id}
            indicator="radio"
            onClick={() => setSelectedStrength(option.id)}
          />
        ))}
      </RowList>
    </OnboardingLayout>
  );
}

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
