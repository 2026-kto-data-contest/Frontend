import { useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../shared/lib/authContext";
import { usePersistentState } from "../../../shared/lib/pageState";
import { Button } from "../../../shared/components/Button";
import { Chip } from "../../../shared/components/Chip";
import { OnboardingLayout } from "./OnboardingLayout";
import { KoreaMap } from "./KoreaMap";
import { finishOnboarding } from "./finishOnboarding";

export const REAL_REGIONS = ["수도권", "충청", "강원", "경상", "전라", "제주"];
const REGION_OPTIONS = [...REAL_REGIONS, "전국"];

export default function OnboardingRegionPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";
  const [selected, setSelected] = usePersistentState<string[]>("onboarding:region", []);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);

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
    const result = await finishOnboarding(auth, navigate, from);
    if (!result.success) {
      setSkipError(result.message ?? null);
    }
    setIsSkipping(false);
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
      onBack={() => navigate(`/onboarding/taste?from=${encodeURIComponent(from)}`)}
      onSkip={handleSkip}
      error={skipError}
      footer={
        <Button
          variant="primary"
          disabled={selected.length === 0}
          style={{ width: "100%" }}
          onClick={() => navigate(`/onboarding/strength?from=${encodeURIComponent(from)}`)}
        >
          다음
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
