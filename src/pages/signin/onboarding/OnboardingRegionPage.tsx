import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePersistentState } from "../../../shared/lib/pageState";
import { Button } from "../../../shared/components/Button";
import { Chip } from "../../../shared/components/Chip";
import { OnboardingLayout } from "./OnboardingLayout";
import { KoreaMap } from "./KoreaMap";
import { finishOnboarding, saveOnboardingPreferenceField } from "./finishOnboarding";
import { fetchOnboardingPreferences } from "../../../shared/api/api";
import type { OnboardingPreferencesData } from "../../../shared/api/api";

export const REAL_REGIONS = ["수도권", "충청", "강원", "경상", "전라", "제주"];
const REGION_OPTIONS = [...REAL_REGIONS, "전국"];

export default function OnboardingRegionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";
  const isEditMode = from === "/mypage";
  const [selected, setSelected] = usePersistentState<string[]>("onboarding:region", []);
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
        setSelected(preferences.regions.length === 0 ? [...REAL_REGIONS] : preferences.regions);
      })
      .catch((error) => console.error("취향 정보 조회 실패", error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const isNationwide = REAL_REGIONS.every((region) => selected.includes(region));

  const toggle = (region: string) => {
    if (region === "전국") {
      // 이미 전 지역이 선택돼 있으면 전체 해제, 아니면 전 지역을 선택 상태로 만듭니다.
      setSelected(isNationwide ? [] : [...REAL_REGIONS]);
      return;
    }
    setSelected((prev) =>
      prev.includes(region) ? prev.filter((item) => item !== region) : [...prev, region]
    );
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
    const regions = isNationwide ? [] : selected;
    const result = await saveOnboardingPreferenceField(navigate, from, {
      liquorTypes: otherPreferences?.liquorTypes ?? [],
      alcoholLevel: otherPreferences?.alcoholLevel ?? "MEDIUM",
      regions,
    });
    if (!result.success) {
      setSaveError(result.message ?? null);
    }
    setIsSaving(false);
  };

  return (
    <OnboardingLayout
      step={2}
      title={
        <>
          어느 지역 양조장이
          <br />
          궁금하세요?
        </>
      }
      subtitle="궁금한 지역을 모두 골라 주세요."
      onBack={() =>
        isEditMode
          ? navigate(from)
          : navigate(`/onboarding/taste?from=${encodeURIComponent(from)}`)
      }
      onSkip={isEditMode ? undefined : handleSkip}
      showProgress={!isEditMode}
      error={isEditMode ? saveError : skipError}
      contentGap={24}
      footer={
        <Button
          variant="primary"
          size="lg"
          disabled={selected.length === 0 || (isEditMode && isSaving)}
          style={{ width: "100%", height: 48, borderRadius: 8 }}
          onClick={
            isEditMode
              ? handleSave
              : () => navigate(`/onboarding/strength?from=${encodeURIComponent(from)}`)
          }
        >
          {isEditMode ? (isSaving ? "저장 중..." : "완료") : "다음"}
        </Button>
      }
    >
      <Wrap>
        <ChipRow>
          {REGION_OPTIONS.map((region) => (
            <Chip
              key={region}
              label={region === "전국" ? "🇰🇷 전국" : region}
              active={region === "전국" ? isNationwide : selected.includes(region)}
              onClick={() => toggle(region)}
            />
          ))}
        </ChipRow>

        <MapArea>
          <KoreaMap selectedRegions={selected} onToggleRegion={toggle} />
        </MapArea>
      </Wrap>
    </OnboardingLayout>
  );
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MapArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;
