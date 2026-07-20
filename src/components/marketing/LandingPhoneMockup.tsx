"use client";

import { HomeScreen } from "@/components/HomeScreen";
import { landingHomePreviewMock } from "@/lib/home-screen";

export function LandingPhoneMockup() {
  return (
    <div className="landing-device" aria-hidden="true">
      <div className="landing-device-shell">
        <div className="landing-device-screen">
          <div className="landing-device-scale-outer">
            <div className="landing-device-scale">
              <HomeScreen previewMode mockData={landingHomePreviewMock} />
            </div>
          </div>
        </div>

        <div className="landing-device-float landing-device-float-lab">
          <span className="landing-device-float-dot" />
          Hb 13,2 — Im Normbereich
        </div>
        <div className="landing-device-float landing-device-float-family">
          Maria sieht mit 💚
        </div>
      </div>
    </div>
  );
}
