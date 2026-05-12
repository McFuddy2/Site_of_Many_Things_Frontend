import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import "./FooterBarStyling.css";

export default function FooterBar({ isExpanded, toggleFooter }) {
  const lastScrollTop = useRef(0);
  const location = useLocation();
  const footerRef = useRef(null);
  const toggleButtonRef = useRef(null);

  useEffect(() => {
    const handleScroll = (e) => {
      const element = e.target;
      const currentScrollTop = element.scrollTop;
      const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 5;
      const isScrollingUp = currentScrollTop < lastScrollTop.current;
      
      if (isAtBottom && !isExpanded) {
        toggleFooter();
      } else if (isScrollingUp && isExpanded) {
        toggleFooter();
      }

      lastScrollTop.current = currentScrollTop;
    };

    // Find all page wrapper elements
    const wrappers = document.querySelectorAll(
      '.about-page-wrapper, .privacy-page-wrapper, .terms-page-wrapper, .release-notes-page-wrapper, .initiative-tracker-landing-page-wrapper, .home-page-wrapper'
    );

    wrappers.forEach(wrapper => {
      wrapper.addEventListener('scroll', handleScroll);
    });

    return () => {
      wrappers.forEach(wrapper => {
        wrapper.removeEventListener('scroll', handleScroll);
      });
    };
  }, [isExpanded, toggleFooter]);

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (footerRef.current?.contains(event.target)) {
        return;
      }

      if (toggleButtonRef.current?.contains(event.target)) {
        return;
      }

      toggleFooter();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isExpanded, toggleFooter]);

  const handleButtonClick = () => {
    if (isExpanded) {
      toggleFooter();
    }
  };

  return (
    <>
      <div
        ref={footerRef}
        className={`footer-bar ${isExpanded ? "expanded" : "minimized"}`}
      >
        <div className="footer-bar-buttons">
          <Link 
            to="/about" 
            className={`footer-button ${location.pathname === '/about' ? 'active' : ''}`} 
            onClick={handleButtonClick}
          >
            About
          </Link>
          <Link 
            to="/articles" 
            className={`footer-button ${location.pathname === '/articles' ? 'active' : ''}`} 
            onClick={handleButtonClick}
          >
            Blog
          </Link>
          <Link 
            to="/privacy" 
            className={`footer-button ${location.pathname === '/privacy' ? 'active' : ''}`} 
            onClick={handleButtonClick}
          >
            Privacy
          </Link>
          <Link 
            to="/terms" 
            className={`footer-button ${location.pathname === '/terms' ? 'active' : ''}`} 
            onClick={handleButtonClick}
          >
            Terms
          </Link>
          <Link 
            to="/release-notes" 
            className={`footer-button ${location.pathname === '/release-notes' ? 'active' : ''}`} 
            onClick={handleButtonClick}
          >
            Release Notes
          </Link>
          <a 
            href="https://buttondown.com/SiteofManyThings" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="footer-button" 
            onClick={handleButtonClick}
          >
            Newsletter
          </a>
          <Link 
            to="/contact" 
            className={`footer-button ${location.pathname === '/contact' ? 'active' : ''}`} 
            onClick={handleButtonClick}
          >
            Contact
          </Link>
          <a 
            href="https://github.com/McFuddy2/Site_of_Many_Things_Frontend" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="footer-button" 
            onClick={handleButtonClick}
          >
            GitHub
          </a>
        </div>
      </div>
      
      <button 
        ref={toggleButtonRef}
        className="footer-toggle-button" 
        onClick={toggleFooter}
        aria-label={isExpanded ? "Minimize footer" : "Expand footer"}
      >
        <span className={`arrow ${isExpanded ? "down" : "up"}`}>
          {isExpanded ? "▼" : "▲"}
        </span>
      </button>
    </>
  );
}

