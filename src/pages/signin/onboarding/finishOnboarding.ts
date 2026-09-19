import {
  completeOnboardingApi,
  saveOnboardingPreferences,
  ApiError,
} from "../../../shared/api/api";
import type { OnboardingPreferencesData } from "../../../shared/api/api";
import { invalidateTabCache } from "../../../shared/lib/pageState";

export interface FinishOnboardingResult {
  success: boolean;
  /** 실패했을 때만 채워집니다. 화면에 그대로 보여줄 안내 문구입니다. */
  message?: string;
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * "건너뛰기" 버튼에서 씁니다. 아무것도 저장·완료 처리하지 않고 그냥 이동만 해서,
 * 온보딩은 여전히 미완료 상태로 남겨둡니다(다음에 다시 들어오면 처음부터 물어봅니다).
 */
export async function finishOnboarding(
  navigate: (path: string) => void,
  fallbackPath: string
): Promise<FinishOnboardingResult> {
  navigate(fallbackPath);
  return { success: true };
}

/**
 * 마지막 단계에서 선택한 취향(주종/지역/도수)을 먼저 저장한 뒤 온보딩을 완료 처리합니다.
 * PUT preferences와 POST complete 중 하나라도 실패하면 화면을 이동시키지 않고 실패를 그대로 반환합니다.
 */
export async function finishOnboardingWithPreferences(
  auth: { refresh: () => Promise<void> },
  navigate: (path: string) => void,
  fallbackPath: string,
  preferences: OnboardingPreferencesData
): Promise<FinishOnboardingResult> {
  try {
    await saveOnboardingPreferences(preferences);
  } catch (error) {
    console.error("취향 저장 실패", error);
    return {
      success: false,
      message: toErrorMessage(error, "취향 저장에 실패했어요. 다시 시도해주세요."),
    };
  }

  try {
    const { nextPath } = await completeOnboardingApi();
    await auth.refresh();
    invalidateTabCache();
    navigate(nextPath || fallbackPath);
    return { success: true };
  } catch (error) {
    console.error("온보딩 완료 처리 실패", error);
    return {
      success: false,
      message: toErrorMessage(error, "온보딩 완료 처리에 실패했어요. 다시 시도해주세요."),
    };
  }
}

/**
 * 마이페이지에서 취향(주종/지역/도수) 중 한 항목만 개별적으로 수정할 때 씁니다.
 * 이미 온보딩을 마친 회원이므로 완료 처리는 다시 하지 않고, 저장 후 바로 돌아갈 경로로 이동합니다.
 */
export async function saveOnboardingPreferenceField(
  navigate: (path: string) => void,
  fallbackPath: string,
  preferences: OnboardingPreferencesData
): Promise<FinishOnboardingResult> {
  try {
    await saveOnboardingPreferences(preferences);
    invalidateTabCache();
    navigate(fallbackPath);
    return { success: true };
  } catch (error) {
    console.error("취향 저장 실패", error);
    return {
      success: false,
      message: toErrorMessage(error, "저장에 실패했어요. 다시 시도해주세요."),
    };
  }
}
