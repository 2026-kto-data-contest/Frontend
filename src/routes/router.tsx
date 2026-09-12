import { createBrowserRouter, Navigate, useSearchParams } from "react-router-dom";
import { Layout, AuthLayout } from "../shared/layouts/RootLayout";
import Home from "../pages/home/Home";
import Map from "../pages/map/Map";
import MyPage from "../pages/mypage/MyPage";
import SinginPage from "../pages/signin/SinginPage";
import TermsPage from "../pages/signin/TermsPage";
import OnboardingTastePage from "../pages/signin/onboarding/OnboardingTastePage";
import OnboardingRegionPage from "../pages/signin/onboarding/OnboardingRegionPage";
import OnboardingStrengthPage from "../pages/signin/onboarding/OnboardingStrengthPage";
import SearchPage from "../pages/search/SearchPage";
import WineryListPage from "../pages/explore/WineryListPage";
import WineryDetailPage from "../pages/winery/WineryDetailPage";
import CourseDetailPage from "../pages/course/CourseDetailPage";
import WithdrawPage from "../pages/mypage/WithdrawPage";

// 백엔드가 약관 동의 이후 "/onboarding"(하위 경로 없이)로 리다이렉트하므로,
// 실제 첫 온보딩 단계로 보내주는 얇은 래퍼입니다. 쿼리스트링은 그대로 이어줍니다.
function OnboardingIndexRedirect() {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  return <Navigate to={`/onboarding/taste${query ? `?${query}` : ""}`} replace />;
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/map",
        element: <Map />,
      },
      {
        path: "/mypage",
        element: <MyPage />,
      },
      {
        path: "/explore",
        element: <WineryListPage />,
      },
      {
        path: "/course/:id",
        element: <CourseDetailPage />,
      },
    ],
  },
  {
    // 네비게이션 바 없이 보여줘야 하는 화면들 (양조장 상세, 로그인/약관/온보딩 등)
    // 아래 /login, /terms, /onboarding 경로는 배포된 백엔드가 그대로 리다이렉트하는
    // 절대 경로이므로 임의로 바꾸면 안 됩니다.
    element: <AuthLayout />,
    children: [
      {
        path: "/winery/:id",
        element: <WineryDetailPage />,
      },
      {
        path: "/mypage/withdraw",
        element: <WithdrawPage />,
      },
      {
        path: "/login",
        element: <SinginPage />,
      },
      {
        path: "/terms",
        element: <TermsPage />,
      },
      {
        path: "/onboarding",
        element: <OnboardingIndexRedirect />,
      },
      {
        path: "/onboarding/taste",
        element: <OnboardingTastePage />,
      },
      {
        path: "/onboarding/region",
        element: <OnboardingRegionPage />,
      },
      {
        path: "/onboarding/strength",
        element: <OnboardingStrengthPage />,
      },
      {
        path: "/search",
        element: <SearchPage />,
      },
    ],
  },
]);
