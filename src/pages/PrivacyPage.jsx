import { useEffect } from "react";
import AdSlot from "../components/AdSlot";
import "../14PrivacyPage.css";
import EmailSignup from "../components/EmailSignup";
import { setMetaDescription, setCanonical } from "../utils/seo";


export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy | Site of Many Things";
    setMetaDescription("Our privacy policy explains what data we collect and how we use it.");
    setCanonical("https://thesiteofmanythings.com/privacy");
  }, []);

  return (
    <main className="privacy-page-wrapper">
      <div className="privacy-page-content">
      <h1 className="text-3xl font-semibold mb-4">Privacy Policy</h1>

      <p className="text-slate-700 mb-4">
        This site respects your time and your data. Here’s what we collect and why.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Analytics</h2>
      <p className="text-slate-700 mb-4">
        We use Google Analytics to understand basic site usage (for example: page views and device type).
        This helps us improve performance and usability. Google Analytics may use cookies or similar
        technologies to measure usage.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Advertising</h2>
      <p className="text-slate-700 mb-4">
        We may display ads (for example, via Google AdSense). Ad providers may use cookies to show
        relevant ads and measure performance.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Data you enter</h2>
      <p className="text-slate-700 mb-4">
        Encounter data you enter into the Initiative Tracker is intended to stay in your browser.
        (If we add accounts/cloud sync later, this policy will be updated.)
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Contact</h2>
      <p className="text-slate-700">
        Privacy questions:  DmMcFuddy@gmail.com
      </p>

      <p className="text-slate-500 mt-8 text-sm">
        Last updated: January 13, 2026
      </p>
      <AdSlot />
      <EmailSignup />
      </div>
    </main>
  );
}
