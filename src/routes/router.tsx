import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../shared/layouts/RootLayout";
import Home from "../pages/home/Home";

export const router = createBrowserRouter([
  {
    element: <Layout />, // Layout으로 감싸기
    children: [
      {
        path: "/",
        element: <Home />,
      },
    ],
  },
]);
