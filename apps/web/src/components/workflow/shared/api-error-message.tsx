"use client";

import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type ApiError = { message?: string } | Error | null | undefined;
type ErrorInput = ApiError | string | null | undefined;

function extractMessage(input: ErrorInput): string {
  if (!input) return "";
  if (typeof input === "string") return input;
  if ("message" in input && typeof input.message === "string")
    return input.message;
  if (input instanceof Error) return input.message;
  return "Operation failed.";
}

export type ApiErrorMessageProps = {
  error: ErrorInput;
  title?: string;
  className?: string;
  showIcon?: boolean;
};

export function ApiErrorMessage({
  error,
  title,
  className,
  showIcon = false,
}: ApiErrorMessageProps) {
  if (!error) return null;

  const message = extractMessage(error);
  if (!message) return null;

  const defaultTitle = "API operation unavailable";

  return (
    <Alert
      variant="destructive"
      role="alert"
      className={cn(
        "bg-destructive/10 border-destructive/20 text-destructive",
        className
      )}
    >
      <div className="flex items-start gap-2">
        {showIcon && (
          <ShieldAlert
            size={17}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
        )}
        <AlertDescription className="flex flex-col gap-1">
          {(title ?? defaultTitle) ? (
            <strong>{title ?? defaultTitle}</strong>
          ) : null}
          <span>{message}</span>
        </AlertDescription>
      </div>
    </Alert>
  );
}
