import { useEffect } from "react";
import EmailSignup from "../components/EmailSignup";
import { Link } from "react-router-dom";
import "../13AboutPage.css";
import { setMetaDescription, setCanonical } from "../utils/seo";



export default function AboutPage() {
  useEffect(() => {
    document.title = "About | Site of Many Things";
    setMetaDescription("Learn what Site of Many Things is, who builds it, and what tabletop RPG tools are coming next.");
    setCanonical("https://thesiteofmanythings.com/about");
  }, []);


  return (

    <main className="about-page-wrapper">
      <div className="about-page-content">
      <h1 className="text-3xl font-semibold mb-4">About Site of Many Things</h1>

      <p className="text-slate-700 mb-4">
        Site of Many Things is a growing collection of fast, clean tools for tabletop RPG players and
        Dungeon Masters. The goal is simple: reduce prep, speed up play, and keep the table focused on
        the fun parts.
      </p>

      <p className="text-slate-700 mb-4">
        This site started the same way most campaigns do—by running into friction mid-session. Too many tools
        were bloated, slow, or distracting when all we wanted was clarity. Site of Many Things exists to remove
        that friction.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Who’s behind it</h2>

      <ul className="space-y-4 text-slate-700">
         <li>
    <strong>Jess (GoreJess)</strong> — the brains <em>and</em> the beauty of the frontend. She designs the
    look and feel, then makes sure it actually works at the table. She’s the party’s support character:
    quietly keeping everything alive, readable, and winning.
  </li>

  <li>
    <strong>Caleb (LiquidDarkness)</strong> — the reason the site works. Glenn and Jess bring the ideas;
    Caleb turns them into functional magic. Think “wizard who ships features”… except his last barbarian
    with a flaming sword tried to chop down a tree and may have started a small forest fire. Allegedly.
  </li>

  <li>
    <strong>McFuddy (Glenn)</strong> — the DM who keeps asking “what if…” and the project manager trying
    to keep the long-term vision on track. He builds the rough versions, then Jess and Caleb make them
    beautiful, stable, and mobile-friendly. He also handles backend and business work (spells databases,
    APIs, future character sheet features)… and is always waiting for his turn to DM again.
  </li>
      </ul>

      <p className="text-slate-600 mt-4 italic">
        Built by people who actually run games — and get annoyed when tools slow them down.
      </p>


      <h2 className="text-2xl font-semibold mb-4">What's here now (and what's coming)</h2>
      <p className="text-slate-700 mb-4">
        The{" "}
        <Link to="/initiative" className="text-purple-600 hover:underline">
          Initiative Tracker
        </Link>{" "}
        is the first tool in the suite. More tools are planned over time, including encounter manager,
        spell search, generators, and character-focused utilities—always focused on speed, clarity, and 
        practical use during play.
      </p>

      <p className="text-slate-600 text-sm italic">
        New tools roll out gradually as they’re ready, not on a fixed schedule.
        If you want updates when something new ships, the newsletter is the easiest way to hear about it.
      </p>

      <EmailSignup />

      <h2 className="text-xl font-semibold mt-8 mb-2">What this site is</h2>
      <ul className="list-disc pl-6 text-slate-700 space-y-1">
        <li>Lightweight and easy to use mid-session</li>
        <li>Built for DMs who want clarity, not clutter</li>
        <li>Focused on speed and practical utility</li>
        <li>Tools built to be shared at the table, not hidden behind a DM screen. </li>
      </ul>
      
      <div className="mt-10">
        <Link
          to="/release-notes"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 transition"
        >
          Check out our release notes →
        </Link>
      </div>

        <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
        <p className="text-slate-700">
          Questions, feedback, or partnerships?{" "}
          <Link to="/contact" className="text-purple-600 hover:underline">
            Contact us here.
          </Link>
        </p>

      </div>
    </main>
  );
}

