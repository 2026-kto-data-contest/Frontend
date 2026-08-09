import { RouterProvider } from "react-router-dom";
import { router } from "../src/routes/router";
import { AuthProvider } from "./shared/lib/authContext";
import { PageStateProvider } from "./shared/lib/pageState";

function App() {
  return (
    <AuthProvider>
      <PageStateProvider>
        <RouterProvider router={router} />
      </PageStateProvider>
    </AuthProvider>
  );
}

export default App;
