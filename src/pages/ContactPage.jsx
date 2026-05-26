import { useEffect } from "react";
import "../11InitiativeTrackerLandingPage.css";
import { setMetaDescription, setCanonical } from "../utils/seo";



export default function ContactPage() {
 useEffect(() => {
  document.title = "Contact | Site of Many Things";
  setMetaDescription("Contact the Site of Many Things with bug reports, feature requests, feedback, partnerships, or questions.");
  setCanonical("https://thesiteofmanythings.com/contact");
  }, []);

  return (
    <div className="initiative-tracker-landing-page-wrapper contact-page-wrapper">
      <div className="contact-page-content">
      <h1 className="initiative-tracker-landing-page-title">Contact Us</h1>

        <p className="intro-text">
        Found a bug, have an idea, or want to partner with us? Choose an option below so your message lands
        in the right place.
        </p>


      <div className="faq-section">
        <div>
          <p className="faq-item">Bug Report</p>
          <p>
            <a
              className="faq-link"
              href="https://forms.gle/gdirbKhYCeJSCg3y9"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report a bug
            </a>
          </p>
        </div>

        <div>
          <p className="faq-item">Feature Request</p>
          <p>
            <a
              className="faq-link"
              href="https://forms.gle/gdirbKhYCeJSCg3y9"
              target="_blank"
              rel="noopener noreferrer"
            >
              Submit a feature request
            </a>
          </p>
        </div>

        <div>
          <p className="faq-item">Partnerships</p>
          <p>
            <a
              className="faq-link"
              href="https://forms.gle/gdirbKhYCeJSCg3y9"
              target="_blank"
              rel="noopener noreferrer"
            >
              Interested in working together?
            </a>
          </p>
        </div>

        <div>
          <p className="faq-item">Questions</p>
          <p>
            <a
              className="faq-link"
              href="https://forms.gle/gdirbKhYCeJSCg3y9"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get in touch
            </a>
          </p>
        </div>
      </div>

        <p className="footer-note">
          Prefer email? Reach us at admin@thesiteofmanythings.com
        </p>

      <p className="footer-note">
        Note: We read everything. Replies may take a bit during busy weeks, but your message helps shape
        what we build next.
      </p>
      </div>
    </div>
  );
}
