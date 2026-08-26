import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import NotificationBadge from "./ui/NotificationBadge";

export default function MobileNavMenu({setShowMobileModalMenu, hasOverLimit}) {
  return (
    <motion.div
      className="mobile-header-menu-modal-wrapper"
      onClick={() => {
      setShowMobileModalMenu(false);
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="mobile-header-menu-modal-container"
        onClick={(e) => e.stopPropagation()}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mobile-header-menu-sections">
          <div className="mobile-header-menu-section mobile-header-menu-support-section">
            <div className="mobile-header-menu-modal-buttons">
              <a
                href="https://ko-fi.com/siteofmanythings"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button mob-menu-button-kofi"
              >
                Support Us on Ko-fi
              </a>
            </div>
          </div>

          <div className="mobile-header-menu-section mobile-header-menu-title-section">
            <h2 className="mobile-header-menu-title">Tools</h2>
          </div>

          <div className="mobile-header-menu-section mobile-header-menu-tools-section">
            <div className="mobile-header-menu-modal-buttons">
              <Link
                to="/initiative"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
                onClick={() => setShowMobileModalMenu(false)}
              >
                Initiative
              </Link>
              <Link
                to="/spell-search"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
                onClick={() => setShowMobileModalMenu(false)}
              >
                Spell Searcher
                {hasOverLimit ? <NotificationBadge label="Your saved Spell Books need attention" /> : null}
              </Link>
            </div>
          </div>

          <div className="mobile-header-menu-section mobile-header-menu-title-section">
            <h2 className="mobile-header-menu-title">Other Pages</h2>
          </div>

          <div className="mobile-header-menu-section mobile-header-menu-links-section">
            <div className="mobile-header-menu-modal-buttons">
              <Link
                to="/"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
                onClick={() => setShowMobileModalMenu(false)}
              >
                Home
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
                to="/articles"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
                onClick={() => setShowMobileModalMenu(false)}
              >
                Blog
              </Link>
              <Link
                to="/about"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
                onClick={() => setShowMobileModalMenu(false)}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
                onClick={() => setShowMobileModalMenu(false)}
              >
                Contact
              </Link>
              <Link
                to="/terms"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
                onClick={() => setShowMobileModalMenu(false)}
              >
                Terms
              </Link>
              <Link
                to="/privacy"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mob-menu-button"
                onClick={() => setShowMobileModalMenu(false)}
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
