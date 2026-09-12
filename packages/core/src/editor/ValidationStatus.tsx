

export interface ValidationStatusProps {
  errors: Array<{ path: string; message: string; severity: "error" | "warning" }>;
  className?: string;
}

export function ValidationStatus({ errors, className }: ValidationStatusProps) {
  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warningCount = errors.filter((e) => e.severity === "warning").length;

  if (errors.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-text-secondary ${className ?? ""}`}>
        <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
        No validation errors
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 text-sm ${className ?? ""}`}>
      {errorCount > 0 && (
        <span className="flex items-center gap-1.5 text-red-400">
          <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
          {errorCount} error{errorCount !== 1 ? "s" : ""}
        </span>
      )}
      {warningCount > 0 && (
        <span className="flex items-center gap-1.5 text-yellow-400">
          <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500" />
          {warningCount} warning{warningCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
