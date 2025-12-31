import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { RootLayout } from "@/components/layout/root-layout";
import { HomePage } from "@/pages/home";
import { SettingsPage } from "@/pages/settings";
import { PartsPage } from "@/pages/parts";
import { BomPage } from "@/pages/bom";
import { BomProjectPage } from "@/pages/bom-project";
import GlenairPage from "@/pages/glenair";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/bom" element={<BomPage />} />
          <Route path="/bom/:projectId" element={<BomProjectPage />} />
          <Route path="/glenair" element={<GlenairPage />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" />
    </BrowserRouter>
  );
}

export default App;
