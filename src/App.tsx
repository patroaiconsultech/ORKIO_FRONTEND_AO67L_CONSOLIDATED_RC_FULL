import React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import Landing from "./routes/Landing";
import AppConsole from "./routes/AppConsole";
import InviteAccept from "./routes/InviteAccept";
import AuthCallback from "./routes/AuthCallback";
import PwaUpdateBanner from "./components/PwaUpdateBanner";
import "./styles.css";

export default function App() {
  return (
    <BrowserRouter>
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <PwaUpdateBanner />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppConsole />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
