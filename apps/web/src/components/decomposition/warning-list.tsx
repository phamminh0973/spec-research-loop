import type { SpecGraphView } from "@specloop/schemas";

interface WarningListProps {
  warnings: SpecGraphView["warnings"];
}

export function WarningList({ warnings }: WarningListProps) {
  return (
    <section
      aria-labelledby="warning-list-title"
      style={{
        background: "#fffaf0",
        border: "1px solid #f0d7a1",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          alignItems: "baseline",
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        <h2
          id="warning-list-title"
          style={{ color: "#6d4700", fontSize: 18, margin: 0 }}
        >
          Review warnings
        </h2>
        <span style={{ color: "#86672d", fontSize: 13 }}>
          {warnings.length} active
        </span>
      </div>

      {warnings.length === 0 ? (
        <p style={{ color: "#6d5d3b", marginBottom: 0 }}>
          No deterministic warnings are attached to this reviewed graph.
        </p>
      ) : (
        <ul
          style={{
            display: "grid",
            gap: 12,
            listStyle: "none",
            margin: "14px 0 0",
            padding: 0,
          }}
        >
          {warnings.map((warning, index) => (
            <li
              key={`${warning.code}-${warning.targetClientRef ?? "project"}-${index}`}
              style={{
                background: "#ffffff",
                border: "1px solid #efdcb7",
                borderRadius: 10,
                padding: 13,
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <strong style={{ color: "#7d3f00" }}>{warning.code}</strong>
                <span style={{ color: "#6d5d3b", fontSize: 13 }}>
                  {warning.targetType}
                  {warning.targetClientRef
                    ? ` · ${warning.targetClientRef}`
                    : " · project-level"}
                </span>
              </div>
              <p style={{ color: "#423a2d", margin: "8px 0 4px" }}>
                <strong>Why:</strong> {warning.reason}
              </p>
              <p style={{ color: "#423a2d", margin: 0 }}>
                <strong>Next:</strong> {warning.suggestedAction}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
