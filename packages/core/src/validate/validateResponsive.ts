import type { Theme } from "../types/theme";

export interface ResponsiveValidationError {
  path: string;
  message: string;
}

export function validateResponsiveValue(
  value: unknown,
  theme: Theme,
): ResponsiveValidationError[] {
  const errors: ResponsiveValidationError[] = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return errors;
  }

  const record = value as Record<string, unknown>;

  for (const [key, val] of Object.entries(record)) {
    if (key === "base") continue;

    if (!theme.breakpoints[key]) {
      errors.push({
        path: key,
        message: `Unknown breakpoint "${key}". Expected one of: ${Object.keys(theme.breakpoints).join(", ")}`,
      });
    }

    if (val === undefined || val === null) {
      errors.push({
        path: key,
        message: `Responsive value at "${key}" is null or undefined`,
      });
    }
  }

  return errors;
}

export function validateResponsiveStyle(
  style: Record<string, unknown>,
  theme: Theme,
): ResponsiveValidationError[] {
  const errors: ResponsiveValidationError[] = [];

  for (const [key, value] of Object.entries(style)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;

    const responsiveErrors = validateResponsiveValue(value, theme);
    for (const error of responsiveErrors) {
      errors.push({
        path: `${key}.${error.path}`,
        message: error.message,
      });
    }
  }

  return errors;
}
