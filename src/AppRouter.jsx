import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useState } from "react";

import Header from "./components/Header";
import FooterBar from "./components/FooterBar";
import SideBar from "./components/SideBar";

import App from "./App";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ReleaseNotesPage from "./pages/ReleaseNotesPage";
import Void from "./pages/NotFoundPage";
import ContactPage from "./pages/ContactPage";
import InitiativeTrackerLandingPage from "./pages/InitiativeTrackerLandingPage";
import InitiativePage from "./pages/InitiativePage";

import SpellSearchPage from "./pages/SpellSearchPage";
import TheLibrary from "./pages/TheLibrary";
import CharacterSheetPage from "./pages/CharacterSheetPage";

// Dev-only pages for the Character Sheet: the card-sizing audit and the
// reference engine sandbox. The DEV check is
// static, so production builds drop this import (and its chunk) entirely.
const CharacterSheetGalleryPage = import.meta.env.DEV ? lazy(() => import("./pages/CharacterSheetGalleryPage")) : null;
const CharacterSheetReferenceSandboxPage = import.meta.env.DEV
  ? lazy(() => import("./pages/CharacterSheetReferenceSandboxPage"))
  : null;

import ArticlesIndexPage from "./pages/ArticlesIndexPage";
import ArticlePage from "./pages/ArticlePage";

import ProfilePage from "./pages/ProfilePage";
import VerifyPage from "./pages/VerifyPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OAuthCompletePage from "./pages/OAuthCompletePage";
import OAuthErrorPage from "./pages/OAuthErrorPage";
import { AuthProvider } from "./auth/AuthContext";
import AccountDataSync from "./components/account/AccountDataSync";
import SessionExpiredNotice from "./components/account/SessionExpiredNotice";
import { OverLimitProvider } from "./storage/OverLimitContext";



function AppContent() {
  const location = useLocation();
  const showFooterBar =
    location.pathname !== "/initiative" &&
    location.pathname !== "/spell-search" &&
    location.pathname !== "/library" &&
    location.pathname !== "/character-sheet";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFooterExpanded, setIsFooterExpanded] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    if (!isSidebarOpen) {
      setIsFooterExpanded(false);
    }
  };

  const toggleFooter = () => {
    setIsFooterExpanded(!isFooterExpanded);
    if (!isFooterExpanded) {
      setIsSidebarOpen(false);
    }
  };


  return (
    <>
      <Header toggleSidebar={toggleSidebar} />
      <SideBar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <AccountDataSync />
      <SessionExpiredNotice />

      <main className="page-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/initiative" element={<InitiativePage />} />
          <Route path="/initiative-tracker" element={<InitiativeTrackerLandingPage />} />
          <Route path="/spell-search" element={<SpellSearchPage />} />
          <Route path="/library" element={<TheLibrary />} />
          <Route path="/character-sheet" element={<CharacterSheetPage />} />
          {CharacterSheetGalleryPage && (
            <Route
              path="/character-sheet/gallery"
              element={
                <Suspense fallback={null}>
                  <CharacterSheetGalleryPage />
                </Suspense>
              }
            />
          )}
          {CharacterSheetReferenceSandboxPage && (
            <Route
              path="/character-sheet/references"
              element={
                <Suspense fallback={null}>
                  <CharacterSheetReferenceSandboxPage />
                </Suspense>
              }
            />
          )}


          <Route path="/profile" element={<ProfilePage />} />
          {/* The backend's verification emails link to /verify-email; /verify is
              kept so links already sitting in inboxes still land somewhere. */}
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/verify-email" element={<VerifyPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Where the backend returns the user after a Google sign-in. */}
          <Route path="/oauth-complete" element={<OAuthCompletePage />} />
          <Route path="/oauth-error" element={<OAuthErrorPage />} />

          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/release-notes" element={<ReleaseNotesPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route path="/articles" element={<ArticlesIndexPage />} />
          <Route path="/articles/:slug" element={<ArticlePage />} />

          {/* The Void aka 404 page */}
          <Route path="/Void" element={<Void />} />

          {/*This must be last on the list of routes */}
          <Route path="*" element={<Navigate to="/Void" replace />} />
        </Routes>
      </main>

      {showFooterBar && <FooterBar isExpanded={isFooterExpanded} toggleFooter={toggleFooter} />}
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OverLimitProvider>
          <AppContent />
        </OverLimitProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}