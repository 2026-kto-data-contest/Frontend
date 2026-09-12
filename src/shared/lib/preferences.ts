// 취향 온보딩 선택값(주종/지역/도수)을 저장하는 백엔드 API가 아직 없어서,
// 지금은 온보딩 화면에서 usePersistentState로 남긴 로컬 선택값을 그대로 읽어와
// 홈 화면 등에서 "선호 취향" 문구를 만드는 데에만 사용합니다.
// 나중에 취향 저장 API가 생기면 이 파일을 API 연동으로 교체하면 됩니다.
import { usePersistentState } from "./pageState";
import { TASTE_OPTIONS } from "../../pages/signin/onboarding/OnboardingTastePage";

const DEFAULT_REGION = "수도권";
const DEFAULT_TYPE = "청주";
const DEFAULT_TAG = "깔끔함";

export function useLocalPreferences() {
  const [selectedTaste] = usePersistentState<string[]>("onboarding:taste", []);
  const [selectedRegion] = usePersistentState<string[]>("onboarding:region", []);

  const taste = TASTE_OPTIONS.find((option) => selectedTaste.includes(option.id));
  const region =
    selectedRegion.find((item) => item !== "전국") || selectedRegion[0] || DEFAULT_REGION;
  const type = taste?.type || DEFAULT_TYPE;
  const tag = taste?.tag || DEFAULT_TAG;

  return {
    region,
    type,
    tag,
    label: `${region}의 ${tag} ${type}`,
  };
}
