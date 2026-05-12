import { useEffect, useState } from "react";
import "../11InitiativeTrackerLandingPage.css";
import { setMetaDescription, setCanonical } from "../utils/seo";



export default function ContactPage() {
 useEffect(() => {
  document.title = "Contact | Site of Many Things";
  setMetaDescription("Contact the Site of Many Things with bug reports, feature requests, feedback, partnerships, or questions.");
  setCanonical("https://thesiteofmanythings.com/contact");
  }, []);

  const email = "DmMcFuddy@gmail.com";
  const [copied, setCopied] = useState(false);

  const subject = (text) => encodeURIComponent(text);
  const body = (text) => encodeURIComponent(text);

  const mailto = (subj, bod = "") =>
    `mailto:${email}?subject=${subject(subj)}${bod ? `&body=${body(bod)}` : ""}`;

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
          <p className="faq-item">Feature Request</p>
          <p>
            <a
              className="faq-link"
              href={mailto(
                "Feature Request - Site of Many Things",
                "What feature or tool would you like to see?\n\nWhich tool is this related to, or is it something new? (Initiative Tracker, Spell Searcher, New Tool, etc):\n\nHow would this help you at the table?\n\nHow important is this to you? (Nice to have / Would use it often / Can't play without it):\n\nIs there any other website that is doing this or something similar that you want to point to as an example for us to see?\n\nAnything else we should know?"
              )}
            >
              Email a feature request
             </a>
            {" — or "}
            <a className="faq-link" href="https://forms.gle/rswgAcSa52ZyGebBA" target="_blank" rel="noopener noreferrer">
              use this form if that doesn't work
            </a>
          </p>
        </div>

        <div>
          <p className="faq-item">Bug Report</p>
          <p>
            <a
              className="faq-link"
              href={mailto(
                "Bug Report for Site of Many Things",
                 "BUG REPORT:\n\nWhich tool/page were you using? (Initiative Tracker, Spell Searcher, Home page, etc):\n\nWhat were you trying to do? (Add a new combatant, click on a link, scroll down, enter a filter, etc):\n\nWhat happened? (The more detail you can provide the better):\n\nDoes this happen every time, was it a one time event, or is it only sometimes? (Any patterns you notice may be helpful):\n\nWhat browser were you using? (Safari, Google Chrome, Edge, etc):\n\nWhat device were you using? (Cell Phone, Tablet, PC, Mac, etc):\n\nPlease include any steps to reproduce the issue:\n\nDo you want an email follow-up with updates when available? (Yes or No):\n\nAny additional notes about this issue?\n\nFeel free to attach any images or screen recordings of the issue to help us debug.\n\nThank you for taking the time to fill out this bug report! This will be added to our system for review."
           )}
            >
              Report a bug
             </a>
            {" — or "}
            <a className="faq-link" href="https://forms.gle/rswgAcSa52ZyGebBA" target="_blank" rel="noopener noreferrer">
              use this form if that doesn't work
            </a>
          </p>
        </div>

        

        <div>
          <p className="faq-item">Partnerships</p>
          <p>
            <a
              className="faq-link"
              href={mailto(
                "Partnership Inquiry - Site of Many Things",
                "What kind of partnership are you thinking (content, tools, sponsorship, something else)?”\n\nLink(s) to your work/site:\n\nBest way to follow up:"
              )}
            >
              Interested in working together?
             </a>
            {" — or "}
            <a className="faq-link" href="https://forms.gle/rswgAcSa52ZyGebBA" target="_blank" rel="noopener noreferrer">
              use this form if that doesn't work
            </a>
          </p>
        </div>

        <div>
          <p className="faq-item">Questions</p>
          <p>
            <a className="faq-link" href={mailto("Question/Other - Site of Many Things")}>
              Get in touch
             </a>
            {" — or "}
            <a className="faq-link" href="https://forms.gle/rswgAcSa52ZyGebBA" target="_blank" rel="noopener noreferrer">
              use this form if that doesn't work
            </a>
          </p>
        </div>
      </div>

        <p className="footer-note">
            Above links not working? Email us at{" "}
            <a className="faq-link" href={`mailto:${email}`}>
                {email}
            </a>
            .
        </p>

        <div className="flex justify-center mt-4">
        <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
            try {
                await navigator.clipboard.writeText(email);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                setCopied(false);
            }
            }}
        >
            {copied ? "Copied to clipboard!" : "Copy email address"}
        </button>
        </div>


      <p className="footer-note">
        Note: We read everything. Replies may take a bit during busy weeks, but your message helps shape
        what we build next.
      </p>
      </div>
    </div>
  );
}
