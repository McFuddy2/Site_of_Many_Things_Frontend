import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";

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

import ArticlesIndexPage from "./pages/ArticlesIndexPage";
import ArticlePage from "./pages/ArticlePage";



function AppContent() {
  const location = useLocation();
  const showFooterBar = location.pathname !== "/initiative" && location.pathname !== "/spell-search";

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

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/initiative" element={<InitiativePage />} />
        <Route path="/initiative-tracker" element={<InitiativeTrackerLandingPage />} />
        <Route path="/spell-search" element={<SpellSearchPage />} />


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

      {showFooterBar && <FooterBar isExpanded={isFooterExpanded} toggleFooter={toggleFooter} />}
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}