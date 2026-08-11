"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { SpecGraphView } from "@specloop/schemas";

type SpecNode = SpecGraphView["nodes"][number];

export interface NodeDraft {
  title: string;
  content: string;
  reason: string | null;
}

interface NodeCardProps {
  node: SpecNode;
  relationCount: number;
  warningCount: number;
  disabled?: boolean;
  onSave: (node: SpecNode, draft: NodeDraft) => void | Promise<void>;
  onConfirm: (node: SpecNode) => void | Promise<void>;
  onReject: (node: SpecNode) => void | Promise<void>;
}

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #d9e2ec",
  borderRadius: 16,
  boxShadow: "0 8px 24px rgba(25, 55, 90, 0.07)",
  display: "flex",
  flexDirection: "column" as const,
  gap: 14,
  padding: 18,
};

const inputStyle = {
  border: "1px solid #c7d2df",
  borderRadius: 8,
  boxSizing: "border-box" as const,
  font: "inherit",
  padding: "9px 10px",
  width: "100%",
};

const secondaryButtonStyle = {
  background: "#eef3f8",
  border: "1px solid #c7d2df",
  borderRadius: 8,
  color: "#18324b",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 650,
  padding: "8px 11px",
};

export function NodeCard({
  node,
  relationCount,
  warningCount,
  disabled = false,
  onSave,
  onConfirm,
  onReject,
}: NodeCardProps) {
  const [title, setTitle] = useState(node.title);
  const [content, setContent] = useState(node.content);
  const [reason, setReason] = useState(node.reason ?? "");
  const hasChanges =
    title !== node.title ||
    content !== node.content ||
    reason !== (node.reason ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave(node, {
      title,
      content,
      reason: reason.trim() ? reason : null,
    });
  }

  return (
    <article style={cardStyle} aria-labelledby={`node-title-${node.id}`}>
      <header
        style={{
          alignItems: "flex-start",
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <div>
          <span
            style={{
              background: "#e6f1ff",
              borderRadius: 999,
              color: "#14528a",
              display: "inline-block",
              fontSize: 12,
              fontWeight: 750,
              letterSpacing: "0.04em",
              padding: "4px 8px",
            }}
          >
            {node.type}
          </span>
          <h3
            id={`node-title-${node.id}`}
            style={{ color: "#142b3f", fontSize: 18, margin: "10px 0 0" }}
          >
            {node.title}
          </h3>
        </div>
        <span
          aria-label={`Status: ${node.status}`}
          style={{
            background:
              node.status === "USER_CONFIRMED" ? "#dff6e8" : "#fff2d6",
            borderRadius: 999,
            color: node.status === "USER_CONFIRMED" ? "#17633a" : "#7a4d00",
            fontSize: 12,
            fontWeight: 750,
            padding: "5px 8px",
            whiteSpace: "nowrap",
          }}
        >
          {node.status}
        </span>
      </header>

      <form onSubmit={handleSubmit}>
        <label
          style={{ color: "#41566b", display: "block", fontSize: 13 }}
          htmlFor={`title-${node.id}`}
        >
          Title
        </label>
        <input
          id={`title-${node.id}`}
          style={{ ...inputStyle, margin: "5px 0 12px" }}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={disabled}
        />
        <label
          style={{ color: "#41566b", display: "block", fontSize: 13 }}
          htmlFor={`content-${node.id}`}
        >
          Content
        </label>
        <textarea
          id={`content-${node.id}`}
          style={{
            ...inputStyle,
            lineHeight: 1.45,
            margin: "5px 0 12px",
            minHeight: 96,
          }}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={disabled}
        />
        <label
          style={{ color: "#41566b", display: "block", fontSize: 13 }}
          htmlFor={`reason-${node.id}`}
        >
          Review reason (optional)
        </label>
        <input
          id={`reason-${node.id}`}
          style={{ ...inputStyle, marginTop: 5 }}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={disabled}
        />
        <button
          type="submit"
          style={{
            ...secondaryButtonStyle,
            marginTop: 12,
            opacity: hasChanges && !disabled ? 1 : 0.55,
          }}
          disabled={!hasChanges || disabled}
        >
          Save card
        </button>
      </form>

      <div
        style={{
          borderTop: "1px solid #e6edf3",
          color: "#60758a",
          display: "flex",
          fontSize: 13,
          gap: 14,
          paddingTop: 12,
        }}
      >
        <span>
          {relationCount} relation{relationCount === 1 ? "" : "s"}
        </span>
        <span>
          {warningCount} warning{warningCount === 1 ? "" : "s"}
        </span>
        <span>Ref: {node.clientRef}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => void onConfirm(node)}
          disabled={disabled || node.status === "USER_CONFIRMED"}
        >
          Confirm card
        </button>
        <button
          type="button"
          style={{
            ...secondaryButtonStyle,
            background: "#fff0f0",
            borderColor: "#efb7b7",
            color: "#8e2f2f",
          }}
          onClick={() => void onReject(node)}
          disabled={disabled || node.status === "USER_REJECTED"}
        >
          Reject card
        </button>
      </div>
    </article>
  );
}
