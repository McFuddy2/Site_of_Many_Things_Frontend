import { useEffect, useRef } from "react";

const ADS_ENABLED = false; // flip to true ONLY after AdSense approval + policy is clean

export default function AdSlot() {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!ADS_ENABLED) return;

    // Avoid double-push in React StrictMode (dev) and rerenders
    if (pushedRef.current) return;
    pushedRef.current = true;

    try {
      // AdSense expects window.adsbygoogle to be an array
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (e) {
      console.error("AdSense error", e);
    }
  }, []);

  if (!ADS_ENABLED) return null;

  return (
    <div className="my-8 flex justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-3833669388068916"
        data-ad-slot="XXXXXXXXXX"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
