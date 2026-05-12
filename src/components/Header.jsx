import { useEffect, useState } from "react";
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

    const positionKofiLauncher = () => {
      const desktopIframe = document.getElementById(`kofi-wo-container${KOFI_WIDGET_CSS_ID}`);
      const desktopWrap = desktopIframe?.parentElement;

      if (desktopWrap) {
        desktopWrap.style.setProperty("position", "fixed", "important");
        desktopWrap.style.setProperty("top", "2px", "important");
        desktopWrap.style.setProperty("right", "44px", "important");
        desktopWrap.style.setProperty("left", "auto", "important");
        desktopWrap.style.setProperty("bottom", "auto", "important");
        desktopWrap.style.setProperty("width", "140px", "important");
        desktopWrap.style.setProperty("height", "56px", "important");
        desktopWrap.style.setProperty("margin", "0", "important");
        desktopWrap.style.setProperty("padding", "0", "important");
        desktopWrap.style.setProperty("overflow", "visible", "important");
        desktopWrap.style.setProperty("transform", "scale(0.8)", "important");
        desktopWrap.style.setProperty("transform-origin", "top right", "important");
        desktopWrap.style.setProperty("z-index", "20003", "important");
        desktopWrap.style.setProperty("opacity", "1", "important");
        desktopWrap.style.setProperty("pointer-events", "auto", "important");
      }

      if (desktopIframe) {
        desktopIframe.style.setProperty("position", "static", "important");
        desktopIframe.style.setProperty("width", "140px", "important");
        desktopIframe.style.setProperty("height", "56px", "important");
        desktopIframe.style.setProperty("margin", "0", "important");
        desktopIframe.style.setProperty("padding", "0", "important");
        desktopIframe.style.setProperty("overflow", "visible", "important");
        desktopIframe.style.setProperty("border", "0", "important");
        desktopIframe.style.setProperty("display", "block", "important");
        desktopIframe.style.setProperty("transform", "none", "important");
        desktopIframe.style.setProperty("z-index", "20003", "important");
      }

      const mobileIframe = document.getElementById(`kofi-wo-container-mobi${KOFI_WIDGET_CSS_ID}`);
      const mobileWrap = mobileIframe?.parentElement;
      if (mobileWrap) {
        mobileWrap.style.setProperty("display", "none", "important");
      }
      if (mobileIframe) {
        mobileIframe.style.setProperty("display", "none", "important");
      }
    };

    const drawKofiOverlay = () => {
      if (window.__kofiOverlayInitialized) {
        window.requestAnimationFrame(positionKofiLauncher);
        window.setTimeout(positionKofiLauncher, 250);
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

      window.requestAnimationFrame(positionKofiLauncher);
      window.setTimeout(positionKofiLauncher, 250);

      window.__kofiOverlayInitialized = true;
    };

    window.addEventListener("resize", positionKofiLauncher);

    if (window.kofiWidgetOverlay?.draw) {
      drawKofiOverlay();
      return () => {
        document.body.classList.remove("kofi-overlay-custom-trigger");
        window.removeEventListener("resize", positionKofiLauncher);
      };
    }

    const scriptId = "kofi-overlay-widget-script";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      existingScript.addEventListener("load", drawKofiOverlay);
      return () => {
        document.body.classList.remove("kofi-overlay-custom-trigger");
        window.removeEventListener("resize", positionKofiLauncher);
        existingScript.removeEventListener("load", drawKofiOverlay);
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
    script.async = true;
    script.onload = drawKofiOverlay;
    document.body.appendChild(script);

    return () => {
      document.body.classList.remove("kofi-overlay-custom-trigger");
      window.removeEventListener("resize", positionKofiLauncher);
      script.onload = null;
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
      </nav>
      <Link to="/" className="header-brand">
        {"Site of Many Things"}
        {pageSuffix ? (
          <span className="header-brand-suffix">{` - ${pageSuffix}`}</span>
        ) : null}
      </Link>
      {showMobileModalMenu && <MobileNavMenu setShowMobileModalMenu={setShowMobileModalMenu} />}
    </header>
  );
}
