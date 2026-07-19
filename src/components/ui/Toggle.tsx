type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: "51px",
        height: "31px",
        borderRadius: "16px",
        backgroundColor: checked ? "#1D9E75" : "#E4E2DB",
        position: "relative",
        cursor: "pointer",
        transition: "background-color 200ms ease",
        flexShrink: 0,
        border: "none",
        padding: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "27px",
          height: "27px",
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          position: "absolute",
          top: "2px",
          left: checked ? "22px" : "2px",
          transition: "left 200ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}
