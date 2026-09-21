import type { ReactNode } from "react";

export interface VisualCardProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function VisualCard({
  title,
  description,
  children,
  className,
}: VisualCardProps) {
  return (
    <article
      className={`rounded-lg border border-border bg-surface p-6 shadow-card transition-colors hover:border-border-hover hover:bg-surface-hover ${className ?? ""}`}
    >
      <h3 className="text-lg font-semibold tracking-tight text-text-primary">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </article>
  );
}
