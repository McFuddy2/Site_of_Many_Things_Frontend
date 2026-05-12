import { useEffect } from "react";
import { Link } from "react-router-dom";
import EmailSignup from "../components/EmailSignup";
import AdSlot from "../components/AdSlot";
import "../11InitiativeTrackerLandingPage.css";


export default function InitiativeTrackerLandingPage() {
  useEffect(() => {
    document.title = "Free D&D 5e Initiative Tracker | Site of Many Things";

    const description =
  "Free D&D 5e initiative tracker for DMs and players. Track turn order, rounds, conditions, and concentration fast with no login required.";

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
  }, []);

  return (
    <div className="initiative-tracker-landing-page-wrapper">
      <h1 className="initiative-tracker-landing-page-title">
        Free D&D 5e Initiative Tracker (Fast, Clean, No Login)
      </h1>

       <p className="intro-text">
        This is a <strong>free D&amp;D 5e initiative tracker</strong> built for Dungeon Masters and players 
        who want combat to move quickly and stay readable. Track turn order, rounds, conditions, and
        concentration during live play—without spreadsheets, clutter, or account setup.
      </p>

      <p className="intro-text-large">
        Unlike many initiative trackers built only for the DM, this tracker is designed to be shared. 
        Whether you’re casting it to a TV at the table or screen-sharing during a remote session, 
        everyone can see the turn order, conditions, and flow of combat at a glance.
      </p>

      <p className="intro-text-large">
        If you’re playing D&D 5e, this will feel immediately familiar. If you’re playing another system, it
        still works great for tracking turn order, conditions, and combat flow.
      </p>


      <p className="intro-text">
        <strong>Open the tracker below to start running combat immediately.</strong>
      </p>
      <div className="button-container">
        <Link
          to="/initiative"
          className="btn-primary"
        >
          Open the Initiative Tracker →
        </Link>
      </div>

      <AdSlot />
      <div className="initiative-tracker-landing-page-top">
        <div className="initiative-tracker-landing-page-top-left">
         

      
      <h2>How to use it</h2>
      <ol>
        <li>Add combatants (PCs, monsters, NPCs).</li>
        <li>Set initiative values and sort the order.</li>
        <li>Track turns and rounds as combat progresses.</li>
        <li>Use conditions to keep effects visible at a glance.</li>
      </ol>

      <h2>Why this initiative tracker exists</h2>
      <ul>
        <li><strong>Speed:</strong> fewer clicks, less setup, more playing.</li>
        <li><strong>Clarity:</strong> turn order and key info stays readable.</li>
        <li><strong>Focus:</strong> you should be running a scene—not managing a spreadsheet.</li>
        <li><strong>Shared visibility:</strong> designed to be readable by the whole table, not just the DM. </li>
      </ul>

        </div>
        <div className="initiative-tracker-landing-page-top-right">


      <h2>FAQ</h2>

      <div className="faq-section">
        <div>
          <p className="faq-item">What is an initiative tracker in D&D 5e?</p>
          <p>
            An initiative tracker helps Dungeon Masters track turn order during combat.
            This tool keeps initiative, rounds, and conditions visible so combat flows smoothly.
          </p>
        </div>

        <div>
          <p className="faq-item">Is this free?</p>
          <p>
            Yes. The Initiative Tracker is free to use. Over time we’ll add more tools and optional upgrades,
            but the goal is always: useful first.
          </p>
        </div>

        <div>
          <p className="faq-item">Does it work for D&D 5e?</p>
          <p>
            Yep. It’s built with D&D 5e flow in mind, but it works for any tabletop system with initiative /
            turn order.
          </p>
        </div>

        <div>
          <p className="faq-item">Do I need an account?</p>
          <p>
            No account required. (If we add accounts/cloud sync later, it will be optional and clearly
            explained.)
          </p>
        </div>

        <div>
          <p className="faq-item">Where can I send feedback?</p>
          <p>
            Email us from the address listed on the{" "}
            <Link to="/about" className="faq-link">
              About page
            </Link>
            .
          </p>
        </div>
      </div>
      </div>
        </div>      

      <EmailSignup />

      <Link
        to="/release-notes"
        className="btn-secondary"
      >
        View release notes
      </Link>

      <p className="footer-note">
        Note: This page exists to explain the tool and help new DMs get started quickly.
      </p>
    </div>
  );
}
