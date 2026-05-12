import { Link } from "react-router-dom";

export default function MobileNavMenu({setShowMobileModalMenu}) {
  return (
    <div className="mobile-header-menu-modal-wrapper" onClick={() => {
      setShowMobileModalMenu(false);
    }}>
      <div className="mobile-header-menu-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-header-menu-modal-buttons">
          <Link 
            to="/"
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
            onClick={() => setShowMobileModalMenu(false)}
          >
            Home
          </Link>
          <Link 
            to="/about"
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
            onClick={() => setShowMobileModalMenu(false)}
          >
            About
          </Link>
          <Link
            to="/privacy"
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
            onClick={() => setShowMobileModalMenu(false)}
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
            onClick={() => setShowMobileModalMenu(false)}
          >
            Terms
          </Link>
          <a
            href="https://buttondown.com/SiteofManyThings"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
            onClick={() => setShowMobileModalMenu(false)}
          >
            Newsletter
          </a>
          <Link
            to="/initiative-tracker"
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
            onClick={() => setShowMobileModalMenu(false)}
          >
            Initiative
          </Link>
        </div>
      </div>
    </div>
  );
}
