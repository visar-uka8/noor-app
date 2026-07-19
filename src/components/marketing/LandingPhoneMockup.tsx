import { FlaskConical, Pill, ShieldPlus, Users } from "lucide-react";

const cards = [
  {
    icon: Pill,
    title: "Medikamente",
    subtitle: "Alle bestätigt ✓",
  },
  {
    icon: FlaskConical,
    title: "Laborwerte",
    subtitle: "5. Juni",
  },
  {
    icon: Users,
    title: "Familie",
    subtitle: "Alex folgt mit 💚",
    subtitleColor: "#1D9E75",
  },
  {
    icon: ShieldPlus,
    title: "Mein Pass",
    subtitle: "Vollständig",
    dotColor: "#1D9E75",
  },
];

export function LandingPhoneMockup() {
  return (
    <div
      style={{
        maxWidth: "280px",
        width: "100%",
        margin: "40px auto 0",
        borderRadius: "32px",
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.28)",
        border: "3px solid rgba(255, 255, 255, 0.25)",
        backgroundColor: "#F7F6F2",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          backgroundColor: "#1D9E75",
          borderBottomLeftRadius: "24px",
          borderBottomRightRadius: "24px",
          padding: "18px 16px 16px",
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                lineHeight: 1.25,
              }}
            >
              Guten Morgen, Hans 👋
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.9)",
                marginTop: "6px",
              }}
            >
              Alle Medikamente heute genommen ✓
            </div>
          </div>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              border: "2px solid rgba(255,255,255,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            H
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 12px 16px" }}>
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "14px",
            border: "0.5px solid #E4E2DB",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <div style={{ fontSize: "24px", lineHeight: 1 }}>🔥</div>
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#085041",
              }}
            >
              5 Tage in Folge
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#88856F",
                marginTop: "2px",
              }}
            >
              Alle Medikamente genommen — weiter so!
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                style={{
                  position: "relative",
                  backgroundColor: "#FFFFFF",
                  borderRadius: "14px",
                  border: "0.5px solid #E4E2DB",
                  padding: "10px",
                  minHeight: "92px",
                }}
              >
                {card.dotColor ? (
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: card.dotColor,
                    }}
                  />
                ) : null}
                <span
                  style={{
                    display: "flex",
                    width: "36px",
                    height: "36px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "12px",
                    backgroundColor: "#E1F5EE",
                    color: "#1D9E75",
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#085041",
                    lineHeight: 1.2,
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    marginTop: "3px",
                    fontSize: "10px",
                    color: card.subtitleColor ?? "#88856F",
                    lineHeight: 1.3,
                  }}
                >
                  {card.subtitle}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
