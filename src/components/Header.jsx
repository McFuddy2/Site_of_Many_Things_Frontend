import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import MobileNavMenu from "./MobileNavMenu";
import menuIcon from '../media/menu.png'
import "./HeaderStyling.css";

const KOFI_WIDGET_CSS_ID = "siteofmanythings-kofi-overlay";
const KOFI_LAUNCHER_STYLE = "position: fixed; top: 2px; right: 44px; left: auto; bottom: auto; width: 140px; height: 56px; transform: scale(0.8); transform-origin: top right;";

export default function Header({toggleSidebar}) {
  const [showMobileModalMenu, setShowMobileModalMenu] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add("kofi-overlay-custom-trigger");

    // Helper to hide Ko-fi widget on mobile
    const hideKofiWidgetOnMobile = () => {
      const desktopIframe = document.getElementById(`kofi-wo-container${KOFI_WIDGET_CSS_ID}`);
      const desktopWrap = desktopIframe?.parentElement;
      const mobileIframe = document.getElementById(`kofi-wo-container-mobi${KOFI_WIDGET_CSS_ID}`);
      const mobileWrap = mobileIframe?.parentElement;
      if (window.innerWidth <= 767) {
        // Catch-all selectors for any launcher variant the script injects.
        const floatingWrappers = document.querySelectorAll(
          '.floatingchat-container-wrap, [id^="kofi-wo-container"], [id^="kofi-wo-container-mobi"]'
        );
        if (desktopWrap) desktopWrap.style.setProperty("display", "none", "important");
        if (desktopIframe) desktopIframe.style.setProperty("display", "none", "important");
        if (mobileWrap) mobileWrap.style.setProperty("display", "none", "important");
        if (mobileIframe) mobileIframe.style.setProperty("display", "none", "important");
        floatingWrappers.forEach((el) => {
          el.style.setProperty("display", "none", "important");
          el.style.setProperty("visibility", "hidden", "important");
          el.style.setProperty("pointer-events", "none", "important");
        });
      } else {
        // Restore desktop widget on desktop
        if (desktopWrap) desktopWrap.style.removeProperty("display");
        if (desktopIframe) desktopIframe.style.removeProperty("display");
      }
    };

    // MutationObserver to catch late-injected Ko-fi widget
    const observer = new MutationObserver(() => {
      hideKofiWidgetOnMobile();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", hideKofiWidgetOnMobile);

    // Ko-fi widget injection logic (unchanged)
    const drawKofiOverlay = () => {
      if (window.innerWidth <= 767) {
        hideKofiWidgetOnMobile();
        return;
      }

      if (window.__kofiOverlayInitialized) {
        window.requestAnimationFrame(hideKofiWidgetOnMobile);
        window.setTimeout(hideKofiWidgetOnMobile, 250);
        return;
      }
      if (!window.kofiWidgetOverlay?.draw) {
        return;
      }
      window.kofiWidgetOverlay.draw('siteofmanythings', {
        'type': 'floating-chat',
        'floating-chat.cssId': KOFI_WIDGET_CSS_ID,
        'floating-chat.core.position.bottom-left': KOFI_LAUNCHER_STYLE,
        'floating-chat.donateButton.text': 'Support Us',
        'floating-chat.donateButton.background-color': '#794bc4',
        'floating-chat.donateButton.text-color': '#fff'
      });
      window.requestAnimationFrame(hideKofiWidgetOnMobile);
      window.setTimeout(hideKofiWidgetOnMobile, 250);
      window.__kofiOverlayInitialized = true;
    };

    if (window.kofiWidgetOverlay?.draw) {
      drawKofiOverlay();
    } else {
      const scriptId = "kofi-overlay-widget-script";
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.addEventListener("load", drawKofiOverlay);
      } else {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
        script.async = true;
        script.onload = drawKofiOverlay;
        document.body.appendChild(script);
      }
    }

    // Initial hide in case widget is already present
    hideKofiWidgetOnMobile();

    return () => {
      document.body.classList.remove("kofi-overlay-custom-trigger");
      window.removeEventListener("resize", hideKofiWidgetOnMobile);
      observer.disconnect();
    };
  }, []);

  const titleMap = {
    "/about": "About",
    "/privacy": "Privacy",
    "/terms": "Terms",
    "/release-notes": "Release Notes",
    "/initiative": "Initiative",
    "/contact": "Contact Us",
    "/spell-search": "Spell Searcher",
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
      <AnimatePresence>
        {showMobileModalMenu && <MobileNavMenu setShowMobileModalMenu={setShowMobileModalMenu} />}
      </AnimatePresence>
    </header>
  );
}
