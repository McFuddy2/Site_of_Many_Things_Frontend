import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import MobileNavMenu from "./MobileNavMenu";
import menuIcon from '../media/menu.png'
import bugIcon from '../media/bug-icon-purple-opacity.png'
import "./HeaderStyling.css";

export default function Header({toggleSidebar}) {
  const [showMobileModalMenu, setShowMobileModalMenu] = useState(false);
  const location = useLocation();

  const titleMap = {
    "/about": "About",
    "/privacy": "Privacy",
    "/terms": "Terms",
    "/release-notes": "Release Notes",
    "/initiative": "Initiative",
    "/contact": "Contact Us",
    "/spell-search": "Spell Searcher",
    "/library": "The Library",
    "/articles": "Articles",
  };
  const mapped = titleMap[location.pathname];
  const isArticle = location.pathname.startsWith("/articles");
  const pageSuffix = mapped !== undefined ? mapped : isArticle ? "Articles" : (location.pathname !== "/" ? "The Void" : "");

  return (
    <header className="header">
      <div className="header-mobile">
        {/* <h1>The Site of Many Things!</h1> */}
        <div className="header-mobile-menu" onClick={() => setShowMobileModalMenu(true)}>
          <img src={menuIcon}></img>
        </div>
      </div>
      <nav className="header-nav">
        <button
          className="header-menu-button"
          aria-label="Menu"
          onClick={toggleSidebar}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="header-menu-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>

        <div className="header-spacer"></div>
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLScfTZJf-0mJFXCdnGfaPcoypZFUPLXzDLfC9i6-5ndEanGURw/viewform"
          target="_blank"
          rel="noopener noreferrer"
          className="header-bug-report-button"
          aria-label="Report a bug"
        >
          <img src={bugIcon} alt="Report bug" />
        </a>
        <a
          href="https://ko-fi.com/siteofmanythings"
          target="_blank"
          rel="noopener noreferrer"
          className="header-support-btn"
        >
          Support Us
        </a>
      </nav>
      <Link to="/" className="header-brand">
        {"Site of Many Things"}
        {pageSuffix ? (
          <span className="header-brand-suffix">{` - ${pageSuffix}`}</span>
        ) : null}
      </Link>
      <a
        href="https://docs.google.com/forms/d/e/1FAIpQLScfTZJf-0mJFXCdnGfaPcoypZFUPLXzDLfC9i6-5ndEanGURw/viewform"
        target="_blank"
        rel="noopener noreferrer"
        className="header-bug-report-button-mobile-tablet"
        aria-label="Report a bug"
      >
        <img src={bugIcon} alt="Report bug" />
      </a>
      <AnimatePresence>
        {showMobileModalMenu && <MobileNavMenu setShowMobileModalMenu={setShowMobileModalMenu} />}
      </AnimatePresence>
    </header>
  );
}
