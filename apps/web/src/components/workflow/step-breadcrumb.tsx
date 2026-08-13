import { Check } from "lucide-react";

export type WorkflowStep = {
  label: string;
  state: "complete" | "current" | "blocked" | "pending";
};

export function StepBreadcrumb({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="workflow-breadcrumb" aria-label="Tiến trình nghiên cứu">
      {steps.map((step, index) => (
        <li key={step.label} className={`workflow-step state-${step.state}`}>
          <span className="workflow-step-marker" aria-hidden="true">
            {step.state === "complete" ? <Check size={15} /> : index + 1}
          </span>
          <span className="workflow-step-label">{step.label}</span>
          {index < steps.length - 1 ? (
            <span className="workflow-step-line" aria-hidden="true" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
