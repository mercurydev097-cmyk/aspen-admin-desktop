import { HashRouter, Route, Routes } from "react-router-dom";
import { DataProvider } from "./data/store";
import { Login, RequireAdmin, Shell } from "./desktop/Shell";
import { Overview } from "./desktop/pages/Overview";
import { Calendar } from "./desktop/pages/Calendar";
import { Classes } from "./desktop/pages/Classes";
import { Bookings } from "./desktop/pages/Bookings";
import { Players } from "./desktop/pages/Players";
import { Reports } from "./desktop/pages/Reports";
import { Pricing } from "./desktop/pages/Pricing";
import { SettingsPage } from "./desktop/pages/SettingsPage";

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAdmin><Shell /></RequireAdmin>}>
            <Route index element={<Overview />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="classes" element={<Classes />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="players" element={<Players />} />
            <Route path="reports" element={<Reports />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
