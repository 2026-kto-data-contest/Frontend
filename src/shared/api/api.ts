// 배포된 백엔드(카카오 로그인·약관·온보딩) 연동용 API 클라이언트입니다.
// 인증은 백엔드가 발급하는 HttpOnly 세션 쿠키(JT_SESSION)로 처리되며,
// 카카오 REST API 키/시크릿은 백엔드에만 있고 프론트에는 필요하지 않습니다.

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://jeontongjuro-backend.onrender.com";

export interface Member {
  id: number;
  nickname: string;
  email: string;
  role: string;
  termsAgreed: boolean;
  onboardingCompleted: boolean;
}

export interface TermItem {
  code: string;
  version: string;
  title: string;
  required: boolean;
  contentUrl: string | null;
  agreed: boolean;
}

interface CsrfToken {
  headerName: string;
  token: string;
}

interface NextPathResponse {
  nextPath: string;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** 카카오 로그인 시작 — JSON API가 아니라 브라우저를 백엔드 주소로 그대로 이동시킵니다. */
export function loginWithKakao(returnTo: string) {
  window.location.assign(
    `${API_BASE_URL}/api/v1/auth/kakao?returnTo=${encodeURIComponent(returnTo)}`
  );
}

/** 로그인 회원 정보를 조회합니다. 비로그인/세션 만료(401)면 null을 반환합니다. */
export async function fetchMe(signal?: AbortSignal): Promise<Member | null> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    credentials: "include",
    signal,
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new ApiError(response.status, "회원 정보를 불러오지 못했습니다.");
  return response.json();
}

async function fetchCsrf(): Promise<CsrfToken> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/csrf`, {
    credentials: "include",
  });
  if (!response.ok) throw new ApiError(response.status, "CSRF 토큰을 발급받지 못했습니다.");
  return response.json();
}

/** 상태 변경 요청(POST/PATCH/DELETE) 전 CSRF 토큰을 받아 헤더에 실어 보냅니다. */
export async function apiWithCsrf(path: string, options: RequestInit = {}): Promise<Response> {
  const csrf = await fetchCsrf();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => body?.message)
      .catch(() => null);
    throw new ApiError(response.status, message || `요청이 실패했습니다. (${response.status})`);
  }
  return response;
}

export interface TermAgreementInput {
  code: string;
  agreed: boolean;
}

export async function fetchTerms(signal?: AbortSignal): Promise<TermItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/terms`, {
    credentials: "include",
    signal,
  });
  if (!response.ok) throw new ApiError(response.status, "약관 정보를 불러오지 못했습니다.");
  return response.json();
}

export async function saveTermsAgreements(agreements: TermAgreementInput[]): Promise<void> {
  await apiWithCsrf("/api/v1/terms/agreements", {
    method: "POST",
    body: JSON.stringify({ agreements }),
  });
}

/**
 * 마이페이지 설정에서 LOCATION(위치 기반 추천) 또는 MARKETING(혜택·이벤트 알림) 같은
 * 선택 약관 하나만 켜고 끌 때 씁니다. 필수 약관은 이 API로 철회할 수 없습니다.
 */
export async function updateOptionalAgreement(code: string, agreed: boolean): Promise<TermItem> {
  const response = await apiWithCsrf(`/api/v1/terms/agreements/${code}`, {
    method: "PATCH",
    body: JSON.stringify({ agreed }),
  });
  return response.json();
}

/** 약관 동의 이후 다음에 이동해야 할 경로를 조회합니다. (/onboarding 또는 원래 returnTo) */
export async function continueAuth(): Promise<NextPathResponse> {
  const response = await apiWithCsrf("/api/v1/auth/continue", { method: "POST" });
  return response.json();
}

export type AlcoholLevel = "LIGHT" | "MEDIUM" | "STRONG";

export interface OnboardingPreferencesData {
  liquorTypes: string[];
  /** 빈 배열이면 전국을 선호하는 것으로 처리됩니다. */
  regions: string[];
  alcoholLevel: AlcoholLevel;
}

export async function saveOnboardingPreferences(
  data: OnboardingPreferencesData
): Promise<OnboardingPreferencesData> {
  const response = await apiWithCsrf("/api/v1/onboarding/preferences", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
}

/** 온보딩 완료 처리. 취향(주종/지역/도수) 저장은 saveOnboardingPreferences로 먼저 호출해야 합니다. */
export async function completeOnboardingApi(): Promise<NextPathResponse> {
  const response = await apiWithCsrf("/api/v1/onboarding/complete", { method: "POST" });
  return response.json();
}

export async function logoutApi(): Promise<void> {
  await apiWithCsrf("/api/v1/auth/logout", { method: "POST" });
}

export { ApiError };
