import AdSlot from "./AdSlot";
import TOOL_FOOTER_CONTENT_REGISTRY from "./ToolFooterContentRegistry";
import { Link } from "react-router-dom";
import "./ToolPageFooter.css";

export default function ToolPageFooter({
  helpHidden,
  showHelp,
  learnMoreOpen,
  setLearnMoreOpen,
  contentKey,
  summaryLabel = "Learn How to Use this Tool ↓",
  hideAd = false,
  children,
}) {
  const registryContent = contentKey ? TOOL_FOOTER_CONTENT_REGISTRY[contentKey]?.() : null;
  const content = children ?? registryContent;

  return (
    <div className={`help-n-ad-section ${hideAd ? "no-ad" : ""} ${learnMoreOpen ? "tool-learn-more-is-open" : ""}`}>
      <div className="help-section">
        {!helpHidden ? (
          <div className={`tool-learn-more-wrapper ${learnMoreOpen ? "tool-learn-more-is-open" : ""}`}>
            <div className={`tool-learn-more ${learnMoreOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className="tool-learn-more-summary"
                onClick={() => setLearnMoreOpen((prev) => !prev)}
                aria-expanded={learnMoreOpen}
              >
                <span>{summaryLabel}</span>
                <span className={`tool-learn-more-chevron ${learnMoreOpen ? "is-open" : ""}`}>▾</span>
              </button>

              <div className="tool-learn-more-content">
                {content}
                <div className="tool-learn-more-cta-row">
                  <Link to="/contact" className="tool-learn-more-cta-btn">
                    Report a Bug
                  </Link>
                  <a
                    href="https://buttondown.com/SiteofManyThings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tool-learn-more-cta-btn"
                  >
                    Sign Up for Newsletter
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="tool-learn-more-wrapper">
            <div className="tool-help-collapsed">
              <span className="tool-help-collapsed-text">Help is hidden.</span>
              <button className="tool-help-show-btn" onClick={showHelp} type="button">
                Show help
              </button>
            </div>
          </div>
        )}
      </div>

      {!hideAd && (
        <div className="ad-section">
          <AdSlot />
        </div>
      )}
    </div>
  );
}
