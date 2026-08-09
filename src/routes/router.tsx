import { createBrowserRouter } from "react-router-dom";
import { Layout, AuthLayout } from "../shared/layouts/RootLayout";
import Home from "../pages/home/Home";
import Map from "../pages/map/Map";
import MyPage from "../pages/mypage/MyPage";
import SinginPage from "../pages/signin/SinginPage";
import TermsPage from "../pages/signin/TermsPage";
import KakaoCallbackPage from "../pages/signin/KakaoCallbackPage";
import SearchPage from "../pages/search/SearchPage";
import WineryListPage from "../pages/explore/WineryListPage";
import WineryDetailPage from "../pages/winery/WineryDetailPage";
import CourseDetailPage from "../pages/course/CourseDetailPage";

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
        path: "/winery/:id",
        element: <WineryDetailPage />,
      },
      {
        path: "/course/:id",
        element: <CourseDetailPage />,
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/signin",
        element: <SinginPage />,
      },
      {
        path: "/signin/terms",
        element: <TermsPage />,
      },
      {
        path: "/oauth/callback/kakao",
        element: <KakaoCallbackPage />,
      },
      {
        path: "/search",
        element: <SearchPage />,
      },
    ],
  },
]);
