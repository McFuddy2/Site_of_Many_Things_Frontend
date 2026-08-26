import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import HelpDialog from "./ui/HelpDialog";
import NotificationBadge from "./ui/NotificationBadge";
import { useOverLimit } from "../storage/OverLimitContext";
import "./SideBarStyling.css";

export default function SideBar({ isOpen, toggleSidebar }) {
  const { isOverLimit } = useOverLimit();
  const spellbooksNeedAttention = isOverLimit("spellbooks");

  return (
    <>
      {isOpen && (
        <div className="sidebar-backdrop" onClick={toggleSidebar} />
      )}
      <div
        className={`sidebar ${isOpen ? "open" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sidebar-content">
          <div className="sidebar-buttons">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link to="/" className="sidebar-button" onClick={toggleSidebar}>Home</Link>
            </motion.div>

            <div className="sidebar-divider" />

            <Link to="/initiative" className="sidebar-button-initiative" onClick={toggleSidebar}>Initiative <br /> Tracker</Link>
            <Link to="/spell-search" className="sidebar-button-spell-search" onClick={toggleSidebar}>
              Spell <br /> Searcher
              {spellbooksNeedAttention ? <NotificationBadge label="Your saved Spell Books need attention" /> : null}
            </Link>
          </div>

          <div className="sidebar-bottom">
            <div className="sidebar-divider" />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link to="/about" className="sidebar-button-help" onClick={toggleSidebar}>About</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link to="/articles" className="sidebar-button-help" onClick={toggleSidebar}>Blog</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <a 
                href="https://buttondown.com/SiteofManyThings" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="sidebar-button-help"
              >
                Newsletter
              </a>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link to="/contact" className="sidebar-button-help" onClick={toggleSidebar}>Contact Us</Link>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
