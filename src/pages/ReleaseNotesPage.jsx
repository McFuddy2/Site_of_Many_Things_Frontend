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

      <div className="release-notes-card">
  <h2 className="release-version">Initiative Tracker v1.1 &amp; Spell Searcher v1.0</h2>
  <p className="release-date">Released: February 2026</p>

  <div className="release-top-row">
    <div className="release-left">
      <h3 className="section-title">Spell Searcher — New tool</h3>
      <ul className="bullets">
        <li>A full D&amp;D 5e spell database, free and open to anyone at the table.</li>
        <li>Spells from 15+ official source books, SRD and non-SRD.</li>
        <li>Filter by class, level, school, components, range, concentration, ritual, and source.</li>
        <li>Include and exclude filters with AND, OR, and NOT logic.</li>
        <li>Advanced filter mode for building complex boolean queries.</li>
        <li>Filter for spells a class does NOT have — useful for multi-class builds where overlap and exclusion matter.</li>
        <li>Expandable spell detail cards with full descriptions and source book displayed.</li>
        <li>Copy spell text to clipboard.</li>
        <li>Sort by level or alphabetically, ascending or descending.</li>
        <li>Guided tutorial built into the tool.</li>
      </ul>

      <h3 className="section-title">Initiative Tracker — Updates</h3>
      <ul className="bullets">
        <li>Conditions can now be viewed on combatants that are not currently taking their turn.</li>
        <li>Round counter now defaults to a minimum of 1.</li>
        <li>Summons and minions are automatically unhighlighted when the next turn begins.</li>
        <li>Clicking the backdrop behind any modal now closes it.</li>
        <li>Character name fields now show placeholder text when empty.</li>
        <li>All icon buttons now show tooltip labels on hover.</li>
      </ul>
    </div>

    <div className="release-right">
      <h3 className="section-title">Site updates</h3>
      <ul className="bullets">
        <li>
          <a href="https://ko-fi.com/siteofmanythings" target="_blank" rel="noopener noreferrer">Ko-fi support</a> button added to both tool pages and the site footer.
        </li>
        <li>Newsletter signup added to the footer.</li>
        <li>Articles section launched at <Link to="/articles">/articles</Link>.</li>
        <li>First article published: <Link to="/articles/5e-spell-filter-multi-class">The 5e Spell Filter That Handles Multi-Class Exclusions</Link>.</li>
        <li>Bug report form updated to capture tool, browser, device, and steps to reproduce.</li>
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
        Tell us what slows combat down at your table. Features that reduce friction for DMs are prioritized first.
      </p>
    </div>
  </div>

  <div className="release-notes-actions">
    <Link to="/spell-search" className="btn-primary">
      Open the Spell Searcher →
    </Link>
    <Link to="/initiative" className="btn-primary">
      Open the Tracker →
    </Link>
  </div>
</div>

<div className="release-notes-card">
  <h2 className="release-version">Spring 2026 Update</h2>
  <p className="release-date">Released: May 2026</p>

  <div className="release-top-row">
    <div className="release-left">
      <h3 className="section-title">Both tools now work on mobile and tablet</h3>
      <ul className="bullets">
        <li>Initiative Tracker fully usable at 375px (phone) and 768px (tablet).</li>
        <li>Spell Searcher fully usable at 375px and 768px — filters open in a modal on smaller screens so they do not crowd the spell list.</li>
      </ul>

      <h3 className="section-title">Spell Searcher — Updates</h3>
      <ul className="bullets">
        <li>Source filter added — filter spells by the book they come from.</li>
        <li>When sorting by level, results now sort alphabetically within each level as a tiebreaker.</li>
        <li>Source book name now shown inside each expanded spell description.</li>
        <li>19 additional spells from Heroes of the Forgotten Realms added to the database.</li>
        <li>Artificer spells fully reviewed and corrected.</li>
      </ul>
    </div>

    <div className="release-right">
      <h3 className="section-title">Site updates</h3>
      <ul className="bullets">
        <li>Articles section design updated to match site branding.</li>
        <li>
          <a href="https://ko-fi.com/siteofmanythings" target="_blank" rel="noopener noreferrer">Ko-fi supporter</a> callout added to tool pages and the homepage.
        </li>
        <li>Homepage updated to surface both tools more clearly.</li>
        <li>Second article published: <Link to="/articles/initiative-tracker-whole-table">Why Your Initiative Tracker Should Face the Whole Table, Not Just the DM</Link>.</li>
        <li>Bug report pipeline fixed — reports now route directly to the development board.</li>
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
        Tell us what slows combat down at your table. Features that reduce friction for DMs are prioritized first.
      </p>
    </div>
  </div>

  <div className="release-notes-actions">
    <Link to="/spell-search" className="btn-primary">
      Open the Spell Searcher →
    </Link>
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
