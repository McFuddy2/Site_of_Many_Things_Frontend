const TOOL_FOOTER_CONTENT_REGISTRY = {
  initiative: () => (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h2 className="tool-learn-more-title">
          Free D&amp;D 5e Initiative Tracker (Fast, Clean, No Login)
        </h2>
        <div className="tool-learn-more-actions">
          <button
            type="button"
            className="tool-live-tutorial-btn"
            onClick={() => window.dispatchEvent(new Event("open-initiative-tutorial"))}
          >
            Live Tutorial
          </button>
        </div>
      </div>

      <p className="tool-learn-more-text">
        This is a free D&amp;D 5e initiative tracker built for Dungeon Masters and players who want combat
        to move quickly and stay readable. Track turn order, rounds, conditions, and concentration during
        live play&mdash;without spreadsheets, clutter, or account setup.
      </p>

      <p className="tool-learn-more-text">
        Unlike many initiative trackers built only for the DM, this tracker is designed to be shared.
        Whether you&apos;re casting it to a TV at the table or screen-sharing during a remote session,
        everyone can see the turn order, conditions, and flow of combat at a glance.
      </p>

      <p className="tool-learn-more-text">
        If you&apos;re playing D&amp;D 5e, this will feel immediately familiar. If you&apos;re playing another system,
        it still works great for tracking turn order, conditions, and combat flow.
      </p>

      <h3 className="tool-learn-more-subtitle">How to use it</h3>
      <ol className="tool-learn-more-list">
        <li>Add combatants (PCs, monsters, NPCs).</li>
        <li>Set initiative values and sort the order.</li>
        <li>Track turns and rounds as combat progresses.</li>
        <li>Use conditions to keep effects visible at a glance.</li>
      </ol>

      <h3 className="tool-learn-more-subtitle">Why this initiative tracker exists</h3>
      <ul className="tool-learn-more-list">
        <li><strong>Speed:</strong> fewer clicks, less setup, more playing.</li>
        <li><strong>Clarity:</strong> turn order and key info stays readable.</li>
        <li><strong>Focus:</strong> you should be running a scene&mdash;not managing a spreadsheet.</li>
        <li><strong>Shared visibility:</strong> designed to be readable by the whole table.</li>
      </ul>

      <h3 className="tool-learn-more-subtitle">FAQ</h3>

      <p className="tool-learn-more-text"><strong>What is an initiative tracker in D&amp;D 5e?</strong><br />
        An initiative tracker helps Dungeon Masters track turn order during combat. This tool keeps initiative,
        rounds, and conditions visible so combat flows smoothly.
      </p>

      <p className="tool-learn-more-text"><strong>Is this free?</strong><br />
        Yes. The Initiative Tracker is free to use. Over time we&apos;ll add more tools and optional upgrades,
        but the goal is always: useful first.
      </p>

      <p className="tool-learn-more-text"><strong>Does it work for D&amp;D 5e?</strong><br />
        Yep. It&apos;s built with D&amp;D 5e flow in mind, but it works for any tabletop system with initiative / turn order.
      </p>

      <p className="tool-learn-more-text"><strong>Do I need an account?</strong><br />
        No account required. (If we add accounts/cloud sync later, it will be optional and clearly explained.)
      </p>

      <p className="tool-learn-more-text"><strong>Where can I send feedback?</strong><br />
        Email us from the address listed on the About page.
      </p>
    </>
  ),

  spellSearch: () => (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h2 className="tool-learn-more-title">
          Spell Searcher (Fast, Advanced Filtering)
        </h2>
        <div className="tool-learn-more-actions">
          <button
            type="button"
            className="tool-live-tutorial-btn"
            onClick={() => window.dispatchEvent(new Event("open-spell-tutorial"))}
          >
            Live Tutorial
          </button>
        </div>
      </div>

      <p className="tool-learn-more-text">
        This is a free D&amp;D 5e spell searcher built for Dungeon Masters and players who want to find the right spell quickly.
        Use the filters on the right to search by school, level, class, and more&mdash;with support for complex boolean queries in advanced mode.
      </p>

      <h3 className="tool-learn-more-subtitle">How to use it</h3>
      <ul className="tool-learn-more-list">
        <li><strong>Basic Filters:</strong> Use the toggles to filter by Include and Exclude criteria.</li>
        <li><strong>Advanced Filters:</strong> Build complex boolean queries using AND, OR, and NOT operators.</li>
        <li><strong>Sort &amp; View:</strong> Customize columns and sort results to suit your needs.</li>
        <li><strong>Spellbooks:</strong> Save your favorite spells as spellbooks for quick reference during play.</li>
      </ul>
    </>
  ),
};

export default TOOL_FOOTER_CONTENT_REGISTRY;
