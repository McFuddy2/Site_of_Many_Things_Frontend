import { useEffect } from "react";
import { Link } from "react-router-dom";
import EmailSignup from "../components/EmailSignup";
import AdSlot from "../components/AdSlot";
import "../12ReleaseNotesPage.css";
import { setMetaDescription, setCanonical } from "../utils/seo";


export default function ReleaseNotesPage() {
  useEffect(() => {
  document.title = "Release Notes | Site of Many Things";
  setMetaDescription("Release notes and updates for the Site of Many Things tools, including the D&D initiative tracker.");
  setCanonical("https://thesiteofmanythings.com/release-notes");
}, []);

  return (
    <div className="release-notes-page-wrapper">
      <div className="release-notes-content">
      <h1 className="release-notes-title">Release Notes</h1>
      <p className="release-notes-subtitle">
        A living record of updates to the Site of Many Things and its D&D initiative tracker tools.
      </p>

      <div className="release-notes-card">
        <h2 className="release-version">Initiative Tracker v1.0</h2>
        <p className="release-date">Released: January 2026</p>

        <div className="release-top-row">
          <div className="release-left">
            <h3 className="section-title">What shipped</h3>
            <ul className="bullets">
              <li>Website officially launched.</li>
              <li>Initiative Tracker tool released as the first core Dungeon Master utility on the Site of Many Things.</li>
              <li>Add Enemies, Allies, Player Characters (PCs), and Environmental combatants to initiative order.</li>
              <li>Custom names supported for every combatant.</li>
              <li>Combatants are color-coded based on role (Enemy, PC, Ally, Environment).</li>
              <li>Automatic initiative sorting from highest to lowest, following standard D&D combat rules.</li>
              <li>
                Next and Back buttons track both the active combatant and the current round number.
              </li>
            </ul>

            <h3 className="section-title">Conditions system</h3>
            <ul className="bullets">
              <li>Add conditions directly to combatants.</li>
              <li>Built-in D&D 5e 2024 SRD condition descriptions for all standard combat conditions.</li>
              <li>Support for custom homebrew conditions.</li>
              <li>Optional expiration tracking for conditions.</li>
              <li>
                Conditions are color-coded as beneficial, detrimental, or neutral.
              </li>
              <li>
                View conditions on combatants other than the currently active turn.
              </li>
            </ul>

            <h3 className="section-title">Combat management tools</h3>
            <ul className="bullets">
              <li>
                Settings panel with quick actions to manage encounters efficiently.
              </li>
              <li>Remove all enemies.</li>
              <li>Remove all conditions.</li>
              <li>
                Remove all combatants except PCs while keeping their conditions.
              </li>
              <li>Clear the entire combat list.</li>
            </ul>
          </div>

          <div className="release-right">
            <h3 className="section-title">Design and experience</h3>
            <ul className="bullets">
              <li>Fantasy-inspired visual design across the tracker.</li>
              <li>Clear visual hierarchy for tracking combat state at a glance.</li>
              <li>Designed to minimize mid-session friction for Dungeon Masters and players running combat encounters.</li>
            </ul>

            <h3 className="section-title">Known issues / improvements in progress</h3>
            <ul className="bullets">
              <li>Mobile layout polish and spacing adjustments.</li>
              <li>Ongoing UI consistency improvements across non-tool pages.</li>
              <li>Additional speed-of-play enhancements based on real session use.</li>
            </ul>

            <h3 className="section-title">How to help</h3>
            <p className="faq-item">Bug reports</p>
            <p className="faq-text">
              If something breaks during a session, a screenshot plus what you clicked helps us fix it faster.
              Send feedback using the email listed on the{" "}
              <Link to="/about" className="btn-secondary">About page</Link>.
            </p>

            <p className="faq-item">Feature requests</p>
            <p className="faq-text">
              Tell us what slows combat down at your table. Features that reduce friction for DMs
              are prioritized first.
            </p>
          </div>
        </div>

        <AdSlot />

        <div className="release-notes-actions">
          <Link to="/initiative" className="btn-primary">
            Open the Tracker →
          </Link>
        </div>        
      </div>

      <EmailSignup />
      
      <p className="text-black text-sm mt-4">
        Prefer to browse past updates? You can read all previous newsletters in our{" "}
        <a
          href="https://buttondown.com/SiteofManyThings/archive/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-700"
        >
          public newsletter archive
        </a>.
      </p>

      <p className="footer-note">
        Tip: These release notes highlight changes that affect D&D combat flow and Dungeon Master tools.
      </p>
      </div>
    </div>
  );
}
