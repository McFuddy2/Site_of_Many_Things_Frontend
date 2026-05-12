import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import HelpDialog from "../components/ui/HelpDialog";
import { useState, useEffect } from "react";
import '../10homePage.css';
import swordAndShield from '../media/sword-and-shield.png';
import bookStack from '../media/book-stack.png';
import mainMenuMap from "../media/main-menu-map.png";
import { setMetaDescription, setCanonical } from "../utils/seo";



export default function HomePage() {
  const navigate = useNavigate();
  
    useEffect(() => {
      document.title = "Site of Many Things | Fast tools for DMs and players";
      setMetaDescription(
        "Fast, clean tabletop RPG tools for Dungeon Masters and players. Start with the Initiative Tracker—more tools coming."
      );
      setCanonical("https://thesiteofmanythings.com/");
    }, []);

  const words = [
    "Adventurers",
    "Wanderers",
    "Heroes",
    "Champions",
    "Explorers",
    "Spellcasters",
    "Storytellers",
    "Wayfarers",
    "Travelers",
    "Seekers",
    "Knights",
    "Sages",
    "Mercenaries",
    "Pathfinders",
    "Arcanists",
    "Dreamers",
    "Guardians",
    "Legends"
  ];
  
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [fadeClass, setFadeClass] = useState("fade-in");
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeClass("fade-out");
      
      setTimeout(() => {
        setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
        setFadeClass("fade-in");
      }, 500); // Half second for fade out
    }, 5000); // 5 seconds total (4.5s visible + 0.5s fade)
    
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <div className= "home-page-wrapper">
      <h1 className="home-page-title">
        <div className={`welcome-text ${fadeClass}`}>Welcome</div>
        <div className="rotating-text-container">
          <span className={`rotating-word ${fadeClass}`}>{words[currentWordIndex]}</span>
        </div>
      </h1>
      <div className="home-page-site-name">
        to The Site of Many Things!
      </div>
      <p className="home-page-description">
        Where will your journey take you today?
      </p>
      <div className="home-page-map-background" style={{ backgroundImage: `url(${mainMenuMap})` }}>
        <main className="home-page-main">
          <button className="home-page-initiative-button" onClick={() => navigate('/initiative')}>
            <img src={swordAndShield} alt="Open Initiative Tracker" className="initiative-button-icon" />
          </button>
          <button className="home-page-spell-search-button" onClick={() => navigate('/spell-search')}>
            <img src={bookStack} alt="Open Spell Searcher" className="initiative-button-icon" />
          </button>
        </main>
      </div>
      <div className="mobile-home-page-button-group">
        <main className="mobile-home-page-buttons">
          <div className="mobile-all-buttons">
            <div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mobile-init-button">
                <Link
                  to="/initiative"
                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition"
                >
                  Initiative Tracker
                </Link>
              </motion.div>
            </div>
            <div className="mobile-nav-buttons">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mobile-nav-button-link">
                <Link
                  to="/privacy"
                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition"
                >
                  Privacy
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mobile-nav-button-link">
                <Link
                  to="/about"
                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition"
                >
                  About
                </Link>
              </motion.div>
              <HelpDialog isMobile={true}/>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mobile-nav-button-link">
                <Link
                  to="/terms"
                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition"
                >
                  Terms
                </Link>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
