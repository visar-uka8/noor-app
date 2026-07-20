import {
  AlertCircle,
  FileText,
  MapPin,
  Phone,
} from "lucide-react";

export function LandingLabReportMock() {
  return (
    <div className="landing-mock landing-mock-lab" aria-hidden="true">
      <div className="landing-mock-lab-header">
        <FileText size={18} />
        <span>Laborbefund · 12.06.2026</span>
      </div>
      <div className="landing-mock-lab-rows">
        <div className="landing-mock-lab-row landing-mock-lab-row-confusing">
          <span>Hb</span>
          <strong>13,2 g/dl</strong>
          <span className="landing-mock-lab-ref">11,5–16,0</span>
        </div>
        <div className="landing-mock-lab-row landing-mock-lab-row-confusing">
          <span>CRP</span>
          <strong>8,4 mg/l</strong>
          <span className="landing-mock-lab-ref">&lt; 5,0</span>
        </div>
        <div className="landing-mock-lab-row landing-mock-lab-row-confusing">
          <span>GFR</span>
          <strong>74 ml/min</strong>
          <span className="landing-mock-lab-ref">&gt; 60</span>
        </div>
      </div>
      <div className="landing-mock-lab-question">
        <AlertCircle size={16} />
        Ist das normal? Soll ich anrufen?
      </div>
    </div>
  );
}

export function LandingFamilyWorryMock() {
  return (
    <div className="landing-mock landing-mock-family" aria-hidden="true">
      <div className="landing-mock-family-header">
        <span className="landing-mock-family-avatar">M</span>
        <div>
          <p className="landing-mock-family-name">Maria</p>
          <p className="landing-mock-family-meta">
            <MapPin size={12} /> München · 600 km entfernt
          </p>
        </div>
      </div>
      <div className="landing-mock-family-messages">
        <p>Hat Papa heute seine Tabletten genommen?</p>
        <p>Wie waren die letzten Blutwerte?</p>
      </div>
      <div className="landing-mock-family-call">
        <Phone size={14} />
        Täglich anrufen — oder Noor nutzen
      </div>
    </div>
  );
}

export function LandingLabExplainMock() {
  return (
    <div className="landing-mock landing-mock-explain" aria-hidden="true">
      <p className="landing-mock-explain-label">Noor erklärt:</p>
      <p className="landing-mock-explain-value">Hb 13,2 g/dl</p>
      <p className="landing-mock-explain-text">
        Ihr Hämoglobin liegt im{" "}
        <strong>normalen Bereich</strong>. Das bedeutet: Ihr Blut transportiert
        genug Sauerstoff.
      </p>
      <span className="landing-mock-explain-badge">Im Normbereich ✓</span>
    </div>
  );
}

export function LandingMedicationMock() {
  return (
    <div className="landing-mock landing-mock-med" aria-hidden="true">
      <p className="landing-mock-med-time">Heute, 08:00</p>
      <button type="button" className="landing-mock-med-button">
        Medikamente genommen ✓
      </button>
      <p className="landing-mock-med-note">Alex wurde informiert 💚</p>
    </div>
  );
}

export function LandingFamilyLinkMock() {
  return (
    <div className="landing-mock landing-mock-link" aria-hidden="true">
      <div className="landing-mock-link-row">
        <span className="landing-mock-link-avatar">H</span>
        <span className="landing-mock-link-line" />
        <span className="landing-mock-link-heart">💚</span>
        <span className="landing-mock-link-line" />
        <span className="landing-mock-link-avatar landing-mock-link-avatar-alt">
          M
        </span>
      </div>
      <p>Alles okay heute — ohne anrufen.</p>
    </div>
  );
}

export function LandingPassportQrMock() {
  return (
    <div className="landing-mock landing-mock-qr" aria-hidden="true">
      <div className="landing-mock-qr-grid">
        {Array.from({ length: 49 }).map((_, index) => (
          <span
            key={index}
            className={
              index % 3 === 0 || index % 7 === 0
                ? "landing-mock-qr-cell landing-mock-qr-cell-dark"
                : "landing-mock-qr-cell"
            }
          />
        ))}
      </div>
      <p>Notfall · Hans Müller</p>
      <span>Blutverdünner · Penicillin-Allergie</span>
    </div>
  );
}
