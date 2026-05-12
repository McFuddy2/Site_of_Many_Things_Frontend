import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../11InitiativeTrackerLandingPage.css";

export default function NotFoundPage() {
  useEffect(() => {
    document.title = "The Void | Site of Many Things";
  }, []);

  return (
    <div className="initiative-tracker-landing-page-wrapper">
      <h1 className="initiative-tracker-landing-page-title">THE VOID</h1>

      <p className="intro-text">
        This black page spells disaster. Your search is drawn from your browser and contained in an object
        in an unknown place.
      </p>

      <p className="intro-text-large">
        One or more powerful beings guard the place. While your search is trapped in this way, your browser
        is incapacitated. A wish spell can&apos;t restore your search.
      </p>

      <p className="intro-text-large">
        <strong>The only way to escape is to use the correct link.</strong>
      </p>

      <div className="button-container">
        <Link to="/" className="btn-primary">
          Return to the Material Plane →
        </Link>
      </div>


      <p className="footer-note">
        If you believe you reached the Void in error, start from the homepage and follow the intended path.
      </p>
    </div>
  );
}
