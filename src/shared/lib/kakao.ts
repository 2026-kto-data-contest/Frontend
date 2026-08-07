declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Auth: {
        authorize: (settings: { redirectUri: string; state?: string }) => void;
        setAccessToken: (token: string) => void;
      };
      API: {
        request: (settings: {
          url: string;
          success: (response: unknown) => void;
          fail: (error: unknown) => void;
        }) => void;
      };
    };
  }
}

const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY;

export const isKakaoConfigured = Boolean(KAKAO_JS_KEY);

export const KAKAO_REDIRECT_URI = `${window.location.origin}/oauth/callback/kakao`;

function ensureInitialized() {
  if (!window.Kakao) {
    throw new Error("카카오 SDK를 불러오지 못했습니다.");
  }
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(KAKAO_JS_KEY);
  }
}

export function startKakaoLogin() {
  if (!KAKAO_JS_KEY) {
    throw new Error(
      "카카오 JavaScript 키가 설정되지 않았습니다. .env의 VITE_KAKAO_JS_KEY를 확인해주세요."
    );
  }
  ensureInitialized();
  window.Kakao!.Auth.authorize({ redirectUri: KAKAO_REDIRECT_URI });
}

export interface KakaoProfile {
  nickname: string;
}

interface KakaoTokenResponse {
  access_token: string;
  error?: string;
  error_description?: string;
}

interface KakaoUserMeResponse {
  kakao_account?: {
    profile?: {
      nickname?: string;
    };
  };
}

export async function completeKakaoLogin(code: string): Promise<KakaoProfile> {
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KAKAO_JS_KEY,
      redirect_uri: KAKAO_REDIRECT_URI,
      code,
    }),
  });
  const tokenData = (await tokenRes.json()) as KakaoTokenResponse;
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || "카카오 토큰 발급에 실패했습니다.");
  }

  ensureInitialized();
  window.Kakao!.Auth.setAccessToken(tokenData.access_token);

  return new Promise((resolve, reject) => {
    window.Kakao!.API.request({
      url: "/v2/user/me",
      success: (response) => {
        const nickname = (response as KakaoUserMeResponse)?.kakao_account?.profile?.nickname;
        resolve({ nickname: nickname || "카카오 사용자" });
      },
      fail: (error) => reject(error),
    });
  });
}
