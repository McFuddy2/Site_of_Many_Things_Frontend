// frontend/tools/initiative/src/pages/TermsPage.jsx
import { useEffect } from "react";
import AdSlot from "../components/AdSlot";
import "../15TermsPage.css";
import EmailSignup from "../components/EmailSignup";
import { setMetaDescription, setCanonical } from "../utils/seo";


export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Service | Site of Many Things";
    setMetaDescription("The terms of service for using Site of Many Things.");
    setCanonical("https://thesiteofmanythings.com/terms");
  }, []);

  return (
    <main className="terms-page-wrapper">
      <div className="terms-page-content">
      <h1 className="text-3xl font-semibold mb-4">Terms of Service</h1>

      <p className="text-slate-700 mb-4">
        By using Site of Many Things, you agree to these terms. If you don’t agree, please don’t use the site.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Use of the site</h2>
      <p className="text-slate-700 mb-4">
        Site of Many Things provides tools and resources for tabletop roleplaying games (such as the Initiative
        Tracker). You agree to use the site for lawful purposes and not in a way that harms, disrupts, or
        interferes with the site’s operation, security, or accessibility.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">No guarantees</h2>
      <p className="text-slate-700 mb-4">
        The site and all tools are provided “as is” and “as available.” We don’t guarantee accuracy, reliability,
        uptime, or suitability for any particular purpose. Use the tools at your own discretion and risk.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Intellectual property</h2>
      <p className="text-slate-700 mb-4">
        Unless otherwise stated, the site’s content, design, and code are owned by Site of Many Things. You may
        not copy, reproduce, or redistribute site content without permission, except where allowed by law.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Third-party services</h2>
      <p className="text-slate-700 mb-4">
        This site may display advertisements (for example, via Google AdSense) or link to third-party services.
        We don’t control third-party sites and aren’t responsible for their content, policies, or practices.
        Your interactions with third-party services are governed by their own terms and policies.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Limitation of liability</h2>
      <p className="text-slate-700 mb-4">
        To the fullest extent permitted by law, Site of Many Things will not be liable for any damages arising
        from your use of (or inability to use) the site or its tools.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Changes</h2>
      <p className="text-slate-700 mb-4">
        We may update these terms from time to time. Continued use of the site after updates are posted means
        you accept the updated terms.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Contact</h2>
      <p className="text-slate-700">
        Terms questions: DmMcFuddy@gmail.com
      </p>

      <p className="text-slate-500 mt-8 text-sm">
        Last updated: January 21, 2026
      </p>
      <AdSlot />
      <EmailSignup />
      </div>
    </main>
  );
}
