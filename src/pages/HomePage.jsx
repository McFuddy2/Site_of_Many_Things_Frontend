import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import '../10homePage.css';
import homePageTopLeft from '../media/HomePage_Top_Left.png';
import homePageTopMid from '../media/HomePage_Top_Mid.png';
import homePageTopMidHighlight from '../media/HomePage_Top_Mid_Highlight.png';
import homePageTopRight from '../media/HomePage_Top_Right.png';
import homePageTopRightHighlight from '../media/HomePage_Top_Right_Highlight.png';
import homePageMidLeft from '../media/HomePage_Mid_Left.png';
import homePageMidMid from '../media/HomePage_Mid_Mid.png';
import homePageMidMidInitiative from '../media/HomePage_Mid_Mid_Initiative.png';
import homePageMidMidSpellSearcher from '../media/HomePage_Mid_Mid_Spell_Searcher.png';
import homePageMidMidCombatManager from '../media/HomePage_Mid_Mid_Combat_Manager.png';
import homePageMidRight from '../media/HomePage_Mid_Right.png';
import homePageMidRightHighlight from '../media/HomePage_Mid_Right_Highlight.png';
import homePageBotLeft from '../media/HomePage_Bot_Left.png';
import homePageBotMid from '../media/HomePage_Bot_Mid.png';
import homePageBotRight from '../media/HomePage_Bot_Right.png';
import { setMetaDescription, setCanonical } from "../utils/seo";



export default function HomePage() {
  const [hoverMode, setHoverMode] = useState(null);
  const spellResetTimeoutRef = useRef(null);
  const modeTransitionTimeoutRef = useRef(null);

  const clearSpellResetTimeout = () => {
    if (spellResetTimeoutRef.current) {
      clearTimeout(spellResetTimeoutRef.current);
      spellResetTimeoutRef.current = null;
    }
  };

  const clearModeTransitionTimeout = () => {
    if (modeTransitionTimeoutRef.current) {
      clearTimeout(modeTransitionTimeoutRef.current);
      modeTransitionTimeoutRef.current = null;
    }
  };

  const scheduleModeTransition = (nextMode) => {
    clearModeTransitionTimeout();
    modeTransitionTimeoutRef.current = setTimeout(() => {
      setHoverMode(nextMode);
      modeTransitionTimeoutRef.current = null;
    }, 140);
  };

  const scheduleSpellReset = () => {
    clearSpellResetTimeout();
    spellResetTimeoutRef.current = setTimeout(() => {
      setHoverMode((currentMode) => (currentMode === 'spell' ? null : currentMode));
      spellResetTimeoutRef.current = null;
    }, 500);
  };

  const handleInitiativeHoverStart = () => {
    clearSpellResetTimeout();
    if (hoverMode === 'spell') {
      scheduleModeTransition('initiative');
      return;
    }
    clearModeTransitionTimeout();
    setHoverMode('initiative');
  };

  const handleSpellHoverStart = () => {
    clearSpellResetTimeout();
    clearModeTransitionTimeout();
    setHoverMode('spell');
  };

  const handleComingHoverStart = () => {
    clearSpellResetTimeout();
    if (hoverMode === 'spell') {
      scheduleModeTransition('coming');
      return;
    }
    clearModeTransitionTimeout();
    setHoverMode('coming');
  };

  const handleInitiativeHoverEnd = (event) => {
    clearModeTransitionTimeout();
    if (hoverMode !== 'initiative') {
      return;
    }

    const nextElement = event.relatedTarget;
    if (nextElement instanceof Element && nextElement.closest('.home-page-grid-cell-top-mid, .home-page-grid-cell-mid-mid')) {
      return;
    }
    setHoverMode(null);
  };

  const handleSpellHoverEnd = (event) => {
    const nextElement = event.relatedTarget;
    if (nextElement instanceof Element && nextElement.closest('.home-page-grid-cell-top-right, .home-page-grid-cell-mid-mid')) {
      return;
    }
    scheduleSpellReset();
  };

  const handleComingHoverEnd = (event) => {
    clearModeTransitionTimeout();
    if (hoverMode !== 'coming') {
      return;
    }

    const nextElement = event.relatedTarget;
    if (nextElement instanceof Element && nextElement.closest('.home-page-grid-cell-mid-right, .home-page-grid-cell-mid-mid')) {
      return;
    }
    setHoverMode(null);
  };

  const handleSpellMidMidEnter = () => {
    clearSpellResetTimeout();
    clearModeTransitionTimeout();
  };

  const handleMidMidHoverEnd = (event) => {
    const nextElement = event.relatedTarget;

    if (
      hoverMode === 'initiative' &&
      nextElement instanceof Element &&
      nextElement.closest('.home-page-grid-cell-top-mid, .home-page-grid-cell-mid-mid')
    ) {
      return;
    }

    if (
      hoverMode === 'spell' &&
      nextElement instanceof Element &&
      nextElement.closest('.home-page-grid-cell-top-right, .home-page-grid-cell-mid-mid')
    ) {
      return;
    }

    if (
      hoverMode === 'coming' &&
      nextElement instanceof Element &&
      nextElement.closest('.home-page-grid-cell-mid-right, .home-page-grid-cell-mid-mid')
    ) {
      return;
    }

    if (hoverMode === 'spell') {
      scheduleSpellReset();
      return;
    }

    setHoverMode(null);
  };

  useEffect(() => {
    return () => {
      clearSpellResetTimeout();
      clearModeTransitionTimeout();
    };
  }, []);

  
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
        Where will your<span className="home-page-description-break"><br /></span>journey take you today?
      </p>
      <div className="home-page-map-background">
        <div className={`home-page-image-grid ${hoverMode === 'initiative' ? 'is-initiative-hover' : ''} ${hoverMode === 'spell' ? 'is-spell-hover' : ''} ${hoverMode === 'coming' ? 'is-coming-hover' : ''}`}>
          <div className="home-page-image-grid-cell">
            <img src={homePageTopLeft} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
          </div>
          <Link
            to="/initiative"
            aria-label="Open Initiative Tracker"
            className="home-page-image-grid-cell home-page-grid-cell-top-mid"
            onMouseEnter={handleInitiativeHoverStart}
            onMouseLeave={handleInitiativeHoverEnd}
          >
            <img src={homePageTopMid} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
            <img src={homePageTopMidHighlight} alt="" aria-hidden="true" className="home-page-image-grid-overlay" />
          </Link>
          <Link
            to="/spell-search"
            aria-label="Open Spell Searcher"
            className="home-page-image-grid-cell home-page-grid-cell-top-right"
            onMouseEnter={handleSpellHoverStart}
            onMouseLeave={handleSpellHoverEnd}
          >
            <img src={homePageTopRight} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
            <img src={homePageTopRightHighlight} alt="" aria-hidden="true" className="home-page-image-grid-overlay" />
          </Link>
          <div className="home-page-image-grid-cell">
            <img src={homePageMidLeft} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
          </div>
          {hoverMode === 'initiative' ? (
            <Link
              to="/initiative"
              aria-label="Open Initiative Tracker"
              className="home-page-image-grid-cell home-page-grid-cell-mid-mid"
              onMouseLeave={handleMidMidHoverEnd}
            >
              <img src={homePageMidMid} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
              <img src={homePageMidMidInitiative} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-initiative" />
              <img src={homePageMidMidSpellSearcher} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-spell" />
              <span className="home-page-image-grid-initiative-label">Initiative<br />Tracker</span>
            </Link>
          ) : hoverMode === 'spell' ? (
            <Link
              to="/spell-search"
              aria-label="Open Spell Searcher"
              className="home-page-image-grid-cell home-page-grid-cell-mid-mid"
              onMouseEnter={handleSpellMidMidEnter}
              onMouseLeave={handleMidMidHoverEnd}
            >
              <img src={homePageMidMid} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
              <img src={homePageMidMidInitiative} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-initiative" />
              <img src={homePageMidMidSpellSearcher} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-spell" />
              <img src={homePageMidMidCombatManager} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-coming" />
              <span className="home-page-image-grid-initiative-label">Spell<br />Searcher</span>
            </Link>
          ) : hoverMode === 'coming' ? (
            <div
              className="home-page-image-grid-cell home-page-grid-cell-mid-mid"
              onMouseLeave={handleMidMidHoverEnd}
            >
              <img src={homePageMidMid} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
              <img src={homePageMidMidInitiative} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-initiative" />
              <img src={homePageMidMidSpellSearcher} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-spell" />
              <img src={homePageMidMidCombatManager} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-coming" />
              <span className="home-page-image-grid-initiative-label">Coming<br />Soon!</span>
            </div>
          ) : (
            <div className="home-page-image-grid-cell home-page-grid-cell-mid-mid" onMouseLeave={handleMidMidHoverEnd}>
              <img src={homePageMidMid} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
              <img src={homePageMidMidInitiative} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-initiative" />
              <img src={homePageMidMidSpellSearcher} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-spell" />
              <img src={homePageMidMidCombatManager} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-coming" />
              <span className="home-page-image-grid-initiative-label">Initiative<br />Tracker</span>
            </div>
          )}
          <div
            className="home-page-image-grid-cell home-page-grid-cell-mid-right"
            onMouseEnter={handleComingHoverStart}
            onMouseLeave={handleComingHoverEnd}
          >
            <img src={homePageMidRight} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
            <img src={homePageMidRightHighlight} alt="" aria-hidden="true" className="home-page-image-grid-overlay home-page-image-grid-overlay-coming" />
          </div>
          <div className="home-page-image-grid-cell">
            <img src={homePageBotLeft} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
          </div>
          <div className="home-page-image-grid-cell">
            <img src={homePageBotMid} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
          </div>
          <div className="home-page-image-grid-cell">
            <img src={homePageBotRight} alt="" aria-hidden="true" className="home-page-image-grid-tile" />
          </div>
        </div>
      </div>
      <div className="mobile-home-page-button-group">
        <main className="mobile-home-page-buttons">
          <div className="mobile-all-buttons">
            <div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mobile-init-button">
                <Link
                  to="/initiative"
                  className="mobile-home-action-link mobile-home-initiative-link"
                >
                  <span>Initiative</span>
                  <span>Tracker</span>
                </Link>
              </motion.div>
            </div>
            <div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mobile-init-button">
                <Link
                  to="/spell-search"
                  className="mobile-home-action-link mobile-home-spell-link"
                >
                  <span>Spell</span>
                  <span>Searcher</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
