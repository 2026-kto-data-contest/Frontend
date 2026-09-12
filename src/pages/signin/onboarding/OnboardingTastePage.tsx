import { useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../shared/lib/authContext";
import { usePersistentState } from "../../../shared/lib/pageState";
import { Button } from "../../../shared/components/Button";
import { OnboardingLayout } from "./OnboardingLayout";
import { OptionRow } from "./OptionRow";
import { finishOnboarding } from "./finishOnboarding";
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

export default function OnboardingTastePage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";
  const [selected, setSelected] = usePersistentState<string[]>("onboarding:taste", []);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
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
      step={1}
      title={
        <>
          어떤 맛의 술을
          <br />
          좋아하세요?
        </>
      }
      subtitle="마음에 드는 맛을 모두 골라주세요."
      onBack={() => navigate(-1)}
      onSkip={handleSkip}
      error={skipError}
      footer={
        <Button
          variant="primary"
          disabled={selected.length === 0}
          style={{ width: "100%" }}
          onClick={() => navigate(`/onboarding/region?from=${encodeURIComponent(from)}`)}
        >
          다음
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
  gap: 12px;
`;
