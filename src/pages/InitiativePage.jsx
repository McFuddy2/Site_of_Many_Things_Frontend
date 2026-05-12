import App from "../App";
import { useEffect } from "react";
import { setMetaDescription, setCanonical } from "../utils/seo";


export default function InitiativePage() {
  useEffect(() => {
    document.title = "Free D&D 5e Initiative Tracker | Site of Many Things";
    setMetaDescription(
      "Free D&D 5e initiative tracker for fast, clean combat. Track turn order, rounds, conditions, and concentration. No login."
    );
    setCanonical("https://thesiteofmanythings.com/initiative");
  }, []);

  return (
    <App />
  )
}