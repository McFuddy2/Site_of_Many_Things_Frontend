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
        Found a bug, have an idea, or want to partner with us? 
        <br/>
        Fill out the form below and we will route it to
        the right place.
        </p>

      <div className="contact-form-embed-shell">
        <iframe
          className="contact-form-embed"
          src="https://docs.google.com/forms/d/e/1FAIpQLScfTZJf-0mJFXCdnGfaPcoypZFUPLXzDLfC9i6-5ndEanGURw/viewform?embedded=true"
          title="Contact Form"
          loading="lazy"
        >
          Loading...
        </iframe>
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
