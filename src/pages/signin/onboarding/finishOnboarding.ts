import {
  completeOnboardingApi,
  saveOnboardingPreferences,
  ApiError,
} from "../../../shared/api/api";
import type { OnboardingPreferencesData } from "../../../shared/api/api";

export interface FinishOnboardingResult {
  success: boolean;
  /** 실패했을 때만 채워집니다. 화면에 그대로 보여줄 안내 문구입니다. */
  message?: string;
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * "건너뛰기"처럼 취향 선택 없이 온보딩을 마칠 때 씁니다.
 * 성공 시에만 응답의 nextPath로 이동합니다. 실패하면 화면을 그대로 두고 실패 사유를 반환하므로,
 * 호출하는 쪽에서 반드시 success를 확인한 뒤에만 다음 동작(이동 등)을 진행해야 합니다.
 */
export async function finishOnboarding(
  auth: { refresh: () => Promise<void> },
  navigate: (path: string) => void,
  fallbackPath: string
): Promise<FinishOnboardingResult> {
  try {
    const { nextPath } = await completeOnboardingApi();
    await auth.refresh();
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
