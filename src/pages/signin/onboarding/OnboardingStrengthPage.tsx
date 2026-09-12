import { useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../shared/lib/authContext";
import { usePersistentState } from "../../../shared/lib/pageState";
import { Button } from "../../../shared/components/Button";
import { OnboardingLayout } from "./OnboardingLayout";
import { OptionRow } from "./OptionRow";
import { finishOnboarding, finishOnboardingWithPreferences } from "./finishOnboarding";
import { TASTE_OPTIONS } from "./OnboardingTastePage";
import { ALL_TYPE_FILTERS } from "../../../shared/lib/mockWineries";
import type { AlcoholLevel } from "../../../shared/api/api";
import lightIcon from "../../../assets/icon/Light.svg";
import halfIcon from "../../../assets/icon/Half.svg";
import hardIcon from "../../../assets/icon/Hard.svg";

const ALCOHOL_LEVEL_MAP: Record<string, AlcoholLevel> = {
  light: "LIGHT",
  medium: "MEDIUM",
  strong: "STRONG",
};

export const STRENGTH_OPTIONS = [
  { id: "light", label: "가볍게", sub: "7도 미만" },
  { id: "medium", label: "적당히", sub: "7도 이상 20도 미만" },
  { id: "strong", label: "독하게", sub: "20도 이상" },
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
  const [selectedTaste] = usePersistentState<string[]>("onboarding:taste", []);
  const [selectedRegion] = usePersistentState<string[]>("onboarding:region", []);
  const [selectedStrength, setSelectedStrength] = usePersistentState<string>(
    "onboarding:strength",
    ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const liquorTypes = Array.from(
      new Set(
        TASTE_OPTIONS.filter((option) => selectedTaste.includes(option.id) && option.type).map(
          (option) => option.type
        )
      )
    );
    const regions = selectedRegion.filter((region) => region !== "전국");

    const result = await finishOnboardingWithPreferences(auth, navigate, from, {
      // "어떤 맛이든 좋아요"만 고른 경우처럼 특정 주종이 없으면 전체 주종을 선호하는 것으로 보냅니다.
      liquorTypes: liquorTypes.length > 0 ? liquorTypes : [...ALL_TYPE_FILTERS],
      regions,
      alcoholLevel: ALCOHOL_LEVEL_MAP[selectedStrength] ?? "MEDIUM",
    });
    if (!result.success) {
      setErrorMessage(result.message ?? null);
    }
    setIsSubmitting(false);
  };

  const handleSkip = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await finishOnboarding(auth, navigate, from);
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
      onBack={() => navigate(`/onboarding/region?from=${encodeURIComponent(from)}`)}
      onSkip={handleSkip}
      error={errorMessage}
      footer={
        <Button
          variant="primary"
          disabled={!selectedStrength || isSubmitting}
          style={{ width: "100%" }}
          onClick={handleFinish}
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
