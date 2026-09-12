import { useEffect, useId, useMemo, useRef, useState } from "react";
import type React from "react";
import type {
  ReactNode,
  HTMLAttributes,
  ButtonHTMLAttributes,
  RefObject,
  ChangeEvent,
} from "react";
import { cn } from "../utils/cn";
import { formatCellValue, isNumericFormat, statusColor, type CellFormat } from "../utils/listCell";
import { Icon } from "./icons";
import { useElementWidth } from "../hooks/useElementWidth";
import { MeridianBarChart, MeridianDonutChart, MeridianLineChart } from "./charts";
import { MERIDIAN_DONUT_COLORS, MERIDIAN_SERIES_COLORS } from "../utils/chart";

/*
 * Widget styling follows one token vocabulary — the per-component
 * comments name the file each rule set comes from. The palette, 13px type scale and row
 * heights those classes resolve against live in src/meridian-theme.css.
 *
 * Every default here is overridable from a document's `style` intent: RenderNode passes the
 * resolved intent classes in via `className`, and `cn`'s twMerge drops whichever built-in
 * class conflicts.
 */

function ErrorText({ error }: { error?: string }) {
  if (!error) {
    return null;
  }
  return <span className="text-sm text-red-600 dark:text-red-400">{error}</span>;
}

/** Controls/Base — label + input class sets. */
const CONTROL_LABEL_CLASS = "mb-1 text-sm text-gray-600 dark:text-gray-500";
const CONTROL_INPUT_CLASS =
  "w-full rounded bg-transparent text-base text-gray-900 placeholder-gray-500 focus:outline-none dark:text-gray-100";
const CONTROL_BORDER_CLASS = "border border-gray-200 bg-gray-25 dark:border-gray-800 dark:bg-gray-875";

function controlSizeClass(size: "small" | "large"): string {
  return size === "small" ? "px-2 py-1" : "px-3 py-2";
}

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Container({ children, ...props }: ContainerProps) {
  return <div {...props}>{children}</div>;
}

export interface RowProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Row({ children, ...props }: RowProps) {
  return <div {...props}>{children}</div>;
}

export interface ColumnProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Column({ children, ...props }: ColumnProps) {
  return <div {...props}>{children}</div>;
}

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Stack({ children, ...props }: StackProps) {
  return <div {...props}>{children}</div>;
}

export type SpacerProps = HTMLAttributes<HTMLDivElement>;

export function Spacer(props: SpacerProps) {
  return <div {...props} className={cn("flex-1", props.className)} />;
}

export type DividerProps = HTMLAttributes<HTMLHRElement>;

/** Meridian separates every list row and dashboard section with a 1px gray-200 rule. */
export function Divider({ children: _children, ...props }: DividerProps) {
  return <hr {...props} className={cn("border-t border-gray-200 dark:border-gray-800", props.className)} />;
}

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  value?: string;
  /**
   * Render as `<h1>`…`<h6>` instead of `<p>`. Meridian's page and form titles are real headings
   * (PageHeader's `<h1>`, FormHeader's `<h1>`, Sidebar's `<h6>`), and a document
   * that titles a page needs the same landmark rather than a styled paragraph.
   */
  heading?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Print a bound numeric/date value the way a list cell would. A list's summary figures are
   * the same money as the column they total, so they have to read the same way — an aggregate
   * bound straight into a Text otherwise renders the raw `1500000`.
   */
  format?: CellFormat;
  /** BCP 47 tag used when `format` is set. */
  locale?: string;
  /** ISO 4217 code used when `format` is `currency`. */
  currency?: string;
}

export function Text({ value, heading, format, locale, currency, ...props }: TextProps) {
  const printed = format
    ? formatCellValue(value, format, {
        ...(locale ? { locale } : {}),
        ...(currency ? { currency } : {}),
      })
    : value;
  if (heading) {
    const Tag = `h${heading}` as "h1";
    return <Tag {...props}>{printed}</Tag>;
  }
  return <p {...props}>{printed}</p>;
}

export interface ImageProps extends HTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

export function Image({ src, alt, children: _children, ...props }: ImageProps) {
  return <img src={src} alt={alt} {...props} />;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  /** Meridian's `type` prop, renamed to avoid colliding with the DOM `type` attribute. */
  variant?: "primary" | "secondary";
  /** Icon-only buttons get the narrower `px-3` instead of `px-6`. */
  icon?: boolean;
  /**
   * Name of an outline icon (see `ICON_NAMES`) drawn beside the label — Meridian's Button
   * keeps an icon slot ahead of its default slot for exactly this.
   */
  iconName?: string;
  /** Which side of the label the icon sits on. */
  iconPosition?: "start" | "end";
  /** Drop the filled background (and the fixed `h-8`) for a bare text button. */
  background?: boolean;
  /** Drop horizontal padding entirely. */
  padding?: boolean;
}

/** Button */
export function Button({
  label,
  children,
  variant = "secondary",
  icon = false,
  iconName,
  iconPosition = "start",
  background = true,
  padding = true,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      type={props.type ?? "button"}
      {...props}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-md text-sm",
        background && "h-8",
        isPrimary ? "text-white dark:text-black" : "text-gray-700 dark:text-gray-200",
        background && (isPrimary ? "bg-black dark:bg-gray-300 dark:font-semibold" : "bg-gray-200 dark:bg-gray-900"),
        padding && (icon ? "px-3" : "px-6"),
        props.disabled && "pointer-events-none cursor-not-allowed opacity-50",
        props.className,
      )}
    >
      {iconName && iconPosition === "start" && <Icon name={iconName} className="h-4 w-4 flex-shrink-0" />}
      {label ?? children}
      {iconName && iconPosition === "end" && <Icon name={iconName} className="h-4 w-4 flex-shrink-0" />}
    </button>
  );
}

/**
 * Meridian's status colors — `getBgTextColorClass` in src/utils/colors.ts is
 * `bg-{color}-200 dark:bg-{color}-800` + `text-{color}-700 dark:text-{color}-200`. Written
 * out per color rather than interpolated, because a class assembled at runtime is invisible
 * to Tailwind's scanner (the same reason src/style.css exists at all).
 */
export type BadgeColor = "gray" | "orange" | "green" | "red" | "yellow" | "blue" | "indigo" | "pink" | "purple" | "teal";

const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  gray: "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200",
  orange: "bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200",
  green: "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-200",
  red: "bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200",
  yellow: "bg-yellow-200 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200",
  blue: "bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200",
  indigo: "bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200",
  pink: "bg-pink-200 dark:bg-pink-800 text-pink-700 dark:text-pink-200",
  purple: "bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200",
  teal: "bg-teal-200 dark:bg-teal-800 text-teal-700 dark:text-teal-200",
};

function badgeColorClass(color?: string): string {
  return BADGE_COLOR_CLASSES[(color as BadgeColor) in BADGE_COLOR_CLASSES ? (color as BadgeColor) : "gray"];
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  /** One of Meridian's status colors (src/utils/colors.ts). Anything else falls back to gray. */
  color?: string;
  /**
   * `badge` is Meridian's Badge (`px-2 py-1`); `pill` is its StatusPill / `.pill`
   * utility (`py-0.5 px-1.5`, `text-xs`, `font-medium`) used for document statuses.
   */
  variant?: "badge" | "pill";
  label?: string;
  /** Optional leading outline icon — used for statuses that read better with a mark ("Balanced"). */
  iconName?: string;
}

/** {Badge,StatusPill} */
export function Badge({ children, color = "gray", variant = "badge", label, iconName, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        variant === "pill"
          ? "pill truncate font-medium select-none"
          : "truncate rounded-md px-2 py-1 select-none",
        iconName ? "inline-flex items-center gap-1" : "inline-block",
        badgeColorClass(color),
        props.className,
      )}
    >
      {iconName && <Icon name={iconName} className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />}
      {label ?? children}
    </span>
  );
}

export interface TextFieldProps extends HTMLAttributes<HTMLInputElement> {
  label?: string;
  value?: string;
  error?: string;
  /** Meridian's Base sizes: `small` = px-2 py-1 (form rows), `large` = px-3 py-2. */
  size?: "small" | "large";
  /** Meridian draws the box only where the field isn't already inside a bordered form row. */
  border?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}

/** Controls/{Base,Data} */
export function TextField({
  label,
  value,
  error,
  children: _children,
  id,
  size = "large",
  border = true,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={fieldId} className={CONTROL_LABEL_CLASS}>
          {label}
        </label>
      )}
      <input
        id={fieldId}
        type="text"
        spellCheck={false}
        // A bound field whose stored value is null must still render as a controlled input:
        // React drops to uncontrolled and warns, and the field silently stops tracking state.
        value={value ?? ""}
        aria-invalid={error ? true : undefined}
        {...props}
        className={cn(
          CONTROL_INPUT_CLASS,
          controlSizeClass(size),
          border && CONTROL_BORDER_CLASS,
          "focus:bg-gray-100 dark:focus:bg-gray-850",
          error && "border-red-300 dark:border-red-800",
          props.className,
        )}
      />
      <ErrorText error={error} />
    </div>
  );
}

export interface CheckboxProps extends HTMLAttributes<HTMLInputElement> {
  label?: string;
  checked?: boolean;
}

/**
 * Controls/Check — a 14px box with Meridian's #A1ABB4
 * stroke. Meridian hand-draws the SVG; a native input keeps it keyboard- and
 * screen-reader-operable, with `accent-color` set inline so no arbitrary Tailwind class
 * (which would need safelisting) is involved.
 */
export function Checkbox({ label, checked, children: _children, ...props }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        {...props}
        style={{ width: 14, height: 14, accentColor: "#A1ABB4", ...(props.style ?? {}) }}
        className={cn("cursor-pointer rounded-sm", props.className)}
      />
      {label && <span className="text-base text-gray-600 dark:text-gray-400">{label}</span>}
    </label>
  );
}

export interface SwitchProps extends HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
}

/** Meridian has no switch control; this follows its blue-500 accent and 4px-radius language. */
export function Switch({ checked, ...props }: SwitchProps) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      {...props}
      className={cn(
        "relative h-5 w-9 rounded-full bg-gray-300 transition-colors dark:bg-gray-700",
        checked && "bg-blue-500 dark:bg-blue-600",
        props.className,
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-button transition-transform",
          checked && "translate-x-4",
        )}
      />
    </div>
  );
}

export interface SliderProps extends HTMLAttributes<HTMLInputElement> {
  value?: number;
  min?: number;
  max?: number;
}

export function Slider({ value = 0, min = 0, max = 100, children: _children, ...props }: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      {...props}
      style={{ accentColor: "#33A1FF", ...(props.style ?? {}) }}
      className={cn("vb-slider w-full cursor-pointer", props.className)}
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends HTMLAttributes<HTMLSelectElement> {
  label?: string;
  value?: string;
  placeholder?: string;
  options?: SelectOption[];
  error?: string;
  size?: "small" | "large";
  border?: boolean;
  /** Key holding an option's stored value. A lookup binds rows keyed by the target's own id. */
  optionValueKey?: string;
  /** Key holding an option's visible text. */
  optionLabelKey?: string;
}

/** Controls/Select */
export function Select({
  optionValueKey = "value",
  optionLabelKey = "label",
  label,
  value,
  placeholder,
  options = [],
  error,
  children: _children,
  id,
  size = "large",
  border = true,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={fieldId} className={CONTROL_LABEL_CLASS}>
          {label}
        </label>
      )}
      <select
        id={fieldId}
        value={value ?? ""}
        aria-invalid={error ? true : undefined}
        {...props}
        className={cn(
          CONTROL_INPUT_CLASS,
          controlSizeClass(size),
          border && CONTROL_BORDER_CLASS,
          "cursor-pointer appearance-none focus:bg-gray-100 dark:focus:bg-gray-850",
          error && "border-red-300 dark:border-red-800",
          props.className,
        )}
        // Meridian draws its own chevron; on a native <select> the same mark comes from a
        // background image so the control keeps the platform's keyboard behavior.
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 5 10' fill='none' stroke='%23C7C7C7' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 2.636L2.636 1l1.637 1.636M1 7.364L2.636 9l1.637-1.636'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.5rem center",
          backgroundSize: "0.5rem 1rem",
          paddingInlineEnd: "1.5rem",
          ...(props.style ?? {}),
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => {
          // A lookup binds rows straight from a query, and those carry the target's own keys
          // (`id`/`name`), not `value`/`label`. Without a mapping every such option rendered
          // with an undefined value and no text, so a Link field looked empty and the document
          // it belonged to could not be saved.
          const raw = option as unknown as Record<string, unknown>;
          const value = String(raw[optionValueKey] ?? raw.value ?? "");
          const label = String(raw[optionLabelKey] ?? raw.label ?? value);
          return (
            <option key={`${value}-${index}`} value={value} disabled={option.disabled}>
              {label}
            </option>
          );
        })}
      </select>
      <ErrorText error={error} />
    </div>
  );
}

export interface TextareaProps extends HTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  value?: string;
  rows?: number;
  error?: string;
  size?: "small" | "large";
  border?: boolean;
  placeholder?: string;
}

/** Controls/Text */
export function Textarea({
  label,
  value,
  rows = 4,
  error,
  children: _children,
  id,
  size = "large",
  border = true,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={fieldId} className={CONTROL_LABEL_CLASS}>
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        // A bound field whose stored value is null must still render as a controlled input:
        // React drops to uncontrolled and warns, and the field silently stops tracking state.
        value={value ?? ""}
        rows={rows}
        aria-invalid={error ? true : undefined}
        {...props}
        className={cn(
          CONTROL_INPUT_CLASS,
          controlSizeClass(size),
          border && CONTROL_BORDER_CLASS,
          "resize-none focus:bg-gray-100 dark:focus:bg-gray-850",
          error && "border-red-300 dark:border-red-800",
          props.className,
        )}
      />
      <ErrorText error={error} />
    </div>
  );
}

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  label?: string;
  name?: string;
  value?: string;
  options?: RadioOption[];
  error?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function RadioGroup({
  label,
  name,
  value,
  options = [],
  error,
  onChange,
  children: _children,
  ...props
}: RadioGroupProps) {
  const groupName = name ?? label ?? "radio-group";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={error ? true : undefined}
      {...props}
      className={cn("flex flex-col", props.className)}
    >
      {label && <span className={CONTROL_LABEL_CLASS}>{label}</span>}
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={onChange}
              style={{ width: 14, height: 14, accentColor: "#A1ABB4" }}
              className="cursor-pointer"
            />
            <span className="text-base text-gray-600 dark:text-gray-400">{option.label}</span>
          </label>
        ))}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

export interface FormProps extends HTMLAttributes<HTMLFormElement> {
  children?: ReactNode;
}

export function Form({ children, onSubmit, ...props }: FormProps) {
  return (
    <form
      {...props}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
      }}
    >
      {children}
    </form>
  );
}

export interface ListViewProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function ListView({ children, ...props }: ListViewProps) {
  return <div {...props}>{children}</div>;
}

export interface GridViewProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function GridView({ children, ...props }: GridViewProps) {
  return <div {...props}>{children}</div>;
}

export interface DataTableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  /**
   * ListCell's its column format rule — how this column's raw value is printed.
   * `status` renders StatusPill's coloured pill instead of text. Numeric formats are
   * right-aligned unless `align` says otherwise, matching Meridian's `isNumeric` rule.
   */
  format?: CellFormat;
}

export interface DataTableAction {
  label: string;
  event?: string;
}

export interface DataTableProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  dataSource?: string;
  columns?: DataTableColumn[];
  rows?: Array<Record<string, unknown>>;
  rowActions?: DataTableAction[];
  emptyMessage?: string;
  /** Meridian numbers every list row in a narrow leading column. */
  showIndex?: boolean;
  /** Meridian's Paginator: page sizes [50, 100, 500, All], first one active. */
  paginate?: boolean;
  pageSizes?: number[];
  /**
   * Fired when a row action button is clicked, with the full row data and which action was
   * clicked (matched by `DataTableAction.event`, the JSON `events` key it maps to — wired by
   * RenderNode.tsx's `resolveEvents`). Not fired for actions with no `event` set.
   */
  onRowAction?: (row: Record<string, unknown>, action: DataTableAction, index: number) => void;
  /**
   * Meridian's List makes the whole row the affordance and has no action
   * column at all. Supplying this turns rows into buttons; `rowActions` stays for callers that
   * genuinely need per-row verbs.
   */
  onRowOpen?: (row: Record<string, unknown>, index: number) => void;
  /** BCP 47 tag used to format date and numeric cells. */
  locale?: string;
  /** ISO 4217 code used to format `currency` columns. */
  currency?: string;
}

/**
 * {List,ListCell} + components/Row.
 *
 * Meridian's list is not a `<table>` and not a card: it is a stack of CSS-grid rows on the page
 * background, each `h-row-mid` (3rem) tall, separated by 1px `hr`s, with a 1rem grid gap and
 * a `w-8` index gutter. Nothing is boxed, nothing is shadowed, and the only fill in the whole
 * control is `hover:bg-gray-50` on a row. That flatness is the single biggest difference from
 * a conventional bordered data table, so it is reproduced structurally here rather than
 * approximated with table styling.
 */
export function DataTable({
  title,
  dataSource: _dataSource,
  columns = [],
  rows = [],
  rowActions = [],
  emptyMessage = "No entries found",
  showIndex = true,
  paginate = true,
  pageSizes = [50, 100, 500, -1],
  onRowAction,
  onRowOpen,
  locale,
  currency,
  ...props
}: DataTableProps) {
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizes[0] ?? 50);

  const count = pageSize === -1 ? Math.max(rows.length, 1) : pageSize;
  const maxPages = Math.max(Math.ceil(rows.length / count), 1);
  const currentPage = Math.min(pageNo, maxPages);
  const pageStart = (currentPage - 1) * count;
  const visibleRows = paginate ? rows.slice(pageStart, pageStart + count) : rows;

  const columnCount = columns.length + (rowActions.length > 0 ? 1 : 0);
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${Math.max(columnCount, 1)}, minmax(0, 1fr))`,
    gridGap: "1rem",
  } as const;

  const isLast = (index: number) => index === columnCount - 1;
  // Meridian right-aligns numeric fieldtypes without the column having to ask (ListCell's
  // `cellClass`), so an explicit `align` is an override rather than the only source.
  const alignOf = (column: DataTableColumn) =>
    column.align ?? (isNumericFormat(column.format) ? "right" : undefined);
  const cellOptions = { ...(locale ? { locale } : {}), ...(currency ? { currency } : {}) };

  return (
    <section {...props} className={cn("flex flex-col overflow-hidden text-base", props.className)}>
      {title && (
        <>
          {/* SectionHeader's weight, as a real heading so the section is navigable. */}
          <h3 className="flex h-row-mid flex-shrink-0 items-center px-4 text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <hr className="border-gray-200 dark:border-gray-800" />
        </>
      )}

      {/* Title Row */}
      <div className="flex items-center">
        {showIndex && <div className="me-2 w-8 text-end text-gray-700 dark:text-gray-400">#</div>}
        <div className="h-row-mid flex-1 text-gray-700 dark:text-gray-400" style={gridStyle}>
          {columns.map((column, index) => (
            // List makes each header cell its own `overflow-x-auto` scroller. Reproduced
            // literally that is a scrollable region no keyboard can reach (axe's
            // `scrollable-region-focusable`, serious) — and making every header cell a tab stop
            // to satisfy the rule would put one stop per column ahead of the actual content.
            // A column label is static text, so it truncates like the body cells below it and
            // keeps the full text in `title`: same appearance, nothing left unreachable.
            <div
              key={column.key}
              title={column.label}
              className={cn(
                "flex h-full items-center truncate",
                alignOf(column) === "right" && "justify-end",
                alignOf(column) === "center" && "justify-center",
                isLast(index) && "pe-4",
              )}
            >
              {column.label}
            </div>
          ))}
          {rowActions.length > 0 && (
            // Meridian has no per-row action column at all (rows navigate on click), so there is
            // no upstream header label to copy — left empty rather than inventing one.
            <div className="flex h-full items-center justify-end pe-4" aria-hidden="true" />
          )}
        </div>
      </div>
      <hr className="border-gray-200 dark:border-gray-800" />

      {/* Data Rows */}
      {visibleRows.length > 0 && (
        <div className="overflow-y-auto">
          {visibleRows.map((row, index) => (
            <div key={String(row.id ?? row.name ?? pageStart + index)}>
              {/* DataTable's own rows aren't separate UIDL nodes (RenderNode only stamps
                  data-node-id on nodes it renders directly), so a data-row-id here is the only
                  stable per-row hook a test or a future "row click navigates" affordance has. */}
              <div
                className={cn(
                  "flex items-center hover:bg-gray-50 dark:hover:bg-gray-850",
                  onRowOpen && "cursor-pointer",
                )}
                data-row-id={String(row.id ?? row.name ?? pageStart + index)}
                {...(onRowOpen
                  ? {
                      role: "button",
                      tabIndex: 0,
                      onClick: () => onRowOpen(row, pageStart + index),
                      // A div-as-button is only an affordance for a mouse until it answers the
                      // keys a real button answers.
                      onKeyDown: (event: React.KeyboardEvent) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        onRowOpen(row, pageStart + index);
                      },
                    }
                  : {})}
              >
                {showIndex && (
                  <div className="me-2 w-8 text-end text-gray-700 dark:text-gray-400">{pageStart + index + 1}</div>
                )}
                <div className="h-row-mid flex-1 text-gray-900 dark:text-gray-300" style={gridStyle}>
                  {columns.map((column, cellIndex) => {
                    const raw = row[column.key];
                    const text = formatCellValue(raw, column.format, cellOptions);
                    return (
                      <div
                        key={column.key}
                        className={cn(
                          "flex items-center truncate",
                          alignOf(column) === "right" && "justify-end",
                          alignOf(column) === "center" && "justify-center",
                          isLast(cellIndex) && "pe-4",
                        )}
                      >
                        {column.format === "status" && text ? (
                          <Badge label={text} color={statusColor(text)} variant="pill" />
                        ) : (
                          <span className="truncate">{text}</span>
                        )}
                      </div>
                    );
                  })}
                  {rowActions.length > 0 && (
                    <div className="flex items-center justify-end gap-2 pe-4">
                      {rowActions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={(event) => {
                            // The row itself may be an open-affordance; a verb inside it is a
                            // different intent and must not also open the document.
                            event.stopPropagation();
                            onRowAction?.(row, action, pageStart + index);
                          }}
                          className="flex h-row-smallest items-center rounded-md bg-gray-100 px-3 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-890 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {index !== visibleRows.length - 1 && <hr className="border-gray-200 dark:border-gray-800" />}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {rows.length > 0 && paginate && (
        <div className="mt-auto">
          <hr className="border-gray-200 dark:border-gray-800" />
          <Paginator
            itemCount={rows.length}
            pageNo={currentPage}
            count={count}
            maxPages={maxPages}
            pageSizes={pageSizes}
            activePageSize={pageSize}
            onPageNo={(value) => setPageNo(Math.min(Math.max(1, value), maxPages))}
            onPageSize={(value) => {
              setPageNo(1);
              setPageSize(value);
            }}
          />
        </div>
      )}

      {/* Empty State */}
      {rows.length === 0 && (
        <div className="my-auto flex flex-col items-center justify-center py-8">
          <p className="my-3 text-gray-800 dark:text-gray-200">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}

interface PaginatorProps {
  itemCount: number;
  pageNo: number;
  count: number;
  maxPages: number;
  pageSizes: number[];
  activePageSize: number;
  onPageNo: (value: number) => void;
  onPageSize: (value: number) => void;
}

/**
 * Paginator — a 50px-tall three-column grid: range on the
 * start edge, page stepper centered, page-size selector on the end edge. The size selector is
 * hidden until there are more rows than the smallest page size, which is why short demo lists
 * show only "1 - 3" and "1 / 1".
 */
function Paginator({
  itemCount,
  pageNo,
  count,
  maxPages,
  pageSizes,
  activePageSize,
  onPageNo,
  onPageSize,
}: PaginatorProps) {
  const visibleSizes = pageSizes.filter((size) =>
    size === -1 ? itemCount >= (pageSizes[0] ?? 50) : itemCount >= size,
  );

  return (
    <div
      className="grid select-none grid-cols-3 items-center px-4 text-sm text-gray-800 dark:text-gray-100"
      style={{ height: "50px" }}
    >
      <div className="justify-self-start">
        {`${(pageNo - 1) * count + 1} - ${Math.min(pageNo * count, itemCount)}`}
      </div>

      <div className="flex items-center gap-1 justify-self-center">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onPageNo(pageNo - 1)}
          disabled={pageNo <= 1}
          className={cn(
            "flex h-4 w-4 items-center justify-center",
            pageNo > 1 ? "cursor-pointer text-gray-600 dark:text-gray-500" : "text-transparent",
          )}
        >
          <ChevronIcon direction="left" />
        </button>
        <div className="flex gap-1 rounded bg-gray-100 px-1 dark:bg-gray-890">
          <span className="w-7 text-end">{pageNo}</span>
          <span className="text-gray-600">/</span>
          <span className="w-7">{maxPages}</span>
        </div>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onPageNo(pageNo + 1)}
          disabled={pageNo >= maxPages}
          className={cn(
            "flex h-4 w-4 items-center justify-center",
            pageNo < maxPages ? "cursor-pointer text-gray-600 dark:text-gray-500" : "text-transparent",
          )}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      {visibleSizes.length > 0 && (
        <div className="flex justify-self-end rounded border border-gray-100 dark:border-gray-800">
          {visibleSizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onPageSize(size)}
              className={cn(
                "w-9",
                (activePageSize === size || (activePageSize === itemCount && size === -1)) &&
                  "rounded bg-gray-100 dark:bg-gray-890",
              )}
            >
              {size === -1 ? "All" : size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface PageBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Rows in the whole result, not just the loaded page — a server total. */
  total?: number;
  page?: number;
  pageSize?: number;
  pageSizes?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

/**
 * Paginator as a document-addressable widget, for lists whose paging happens on the
 * server. DataTable's built-in paginator slices the rows it was handed, which is the wrong
 * answer when the query already returned exactly one page: it would report "1 - 1 / 1" no
 * matter how many records exist. This one is told the real total and reports the state the
 * document holds, so a generated list can page for real instead of carrying the fixed
 * "Displaying records" caption and Previous/Next buttons that jumped to pages 1 and 2.
 *
 * The arithmetic (page count, clamping, the visible range) lives here because the JSON
 * expression language has no arithmetic — and should not grow any just to count pages.
 */
export function PageBar({
  total = 0,
  page = 1,
  pageSize = 20,
  pageSizes = [50, 100, 500, -1],
  onPageChange,
  onPageSizeChange,
  ...props
}: PageBarProps) {
  const count = pageSize === -1 ? Math.max(total, 1) : pageSize;
  const maxPages = Math.max(Math.ceil(total / count), 1);
  const currentPage = Math.min(Math.max(page, 1), maxPages);

  return (
    <div {...props}>
      <Paginator
        itemCount={total}
        pageNo={currentPage}
        count={count}
        maxPages={maxPages}
        pageSizes={pageSizes}
        activePageSize={pageSize}
        onPageNo={(value) => onPageChange?.(Math.min(Math.max(1, value), maxPages))}
        onPageSize={(value) => {
          onPageChange?.(1);
          onPageSizeChange?.(value);
        }}
      />
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" | "down" }) {
  const paths = {
    left: "M15 18l-6-6 6-6",
    right: "M9 18l6-6-6-6",
    down: "M6 9l6 6 6-6",
  } as const;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
      aria-hidden="true"
    >
      <path d={paths[direction]} />
    </svg>
  );
}

export interface ChartSeries {
  key: string;
  label?: string;
  color?: string;
}

export interface ChartProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  dataSource?: string;
  chartType?: "bar" | "line" | "donut" | "area";
  rows?: Array<Record<string, unknown>>;
  xKey?: string;
  yKey?: string;
  series?: ChartSeries[];
  emptyMessage?: string;
  /** Meridian's dashboard sections pair the title with a period/filter control on the end edge. */
  action?: ReactNode;
  /** Donut only — the label inside the hole (Meridian: "Total Spending"). */
  totalLabel?: string;
  /**
   * Drawn height in px for bar/line charts. Meridian's dashboard charts all land near 235px
   * regardless of column width, because each call site picks an aspect ratio to make that
   * true; here the ratio is derived from the measured width and this height instead.
   */
  height?: number;
}

/**
 * {Cashflow,ProfitAndLoss,Expenses}.
 *
 * A Meridian dashboard widget is a `p-4` region on the page — no card, no border of its own
 * (the neighbouring section supplies a `border-e`/`hr`) — made of `SectionHeader`
 * (`flex items-baseline justify-between`, `font-semibold text-base`), an optional inline
 * legend, and the SVG chart. Donuts sit beside their legend at half width each, which is how
 * Top Expenses is laid out.
 */
export function Chart({
  title,
  dataSource: _dataSource,
  chartType = "bar",
  rows = [],
  xKey = "label",
  yKey = "value",
  series,
  emptyMessage = "No transactions yet",
  action,
  totalLabel = "Total",
  height = 235,
  ...props
}: ChartProps) {
  const [containerRef, containerWidth] = useElementWidth<HTMLElement>();
  const activeSeries = useMemo<ChartSeries[]>(
    () => (series?.length ? series : [{ key: yKey, label: title ?? yKey }]),
    [series, yKey, title],
  );
  const isDonut = chartType === "donut";

  const seriesColors = activeSeries.map(
    (item, index) => item.color ?? MERIDIAN_SERIES_COLORS[index % MERIDIAN_SERIES_COLORS.length],
  );
  const xLabels = rows.map((row) => formatCell(row[xKey]));
  const points = activeSeries.map((item) => rows.map((row) => Number(row[item.key] ?? 0)));

  // Fall back to Meridian's Cashflow ratio until the first measurement lands.
  const aspectRatio = containerWidth > 0 ? Math.max(containerWidth / height, 1) : 4.15;

  return (
    <section ref={containerRef} {...props} className={cn("flex flex-col", props.className)}>
      {(title || action || (!isDonut && activeSeries.length > 1)) && (
        <div className="flex items-baseline justify-between gap-4 text-gray-900 dark:text-white">
          {title && <span className="text-base font-semibold">{title}</span>}
          {!isDonut && activeSeries.length > 1 && (
            <div className="flex gap-8 text-base">
              {activeSeries.map((item, index) => (
                <div key={item.key} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: seriesColors[index] }}
                  />
                  <span className="text-gray-900 dark:text-gray-25">{item.label ?? item.key}</span>
                </div>
              ))}
            </div>
          )}
          {action}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="flex-center my-20 h-full w-full flex-1">
          <span className="text-base text-gray-600 dark:text-gray-500">{emptyMessage}</span>
        </div>
      ) : isDonut ? (
        <div className="relative flex">
          <div className="flex w-1/2 flex-col justify-center gap-4 dark:text-gray-25">
            {rows.map((row, index) => (
              <div key={String(row[xKey] ?? index)} className="flex items-center text-sm">
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: MERIDIAN_DONUT_COLORS[index % MERIDIAN_DONUT_COLORS.length] }}
                />
                <p className="no-scrollbar ms-2 w-28 overflow-x-auto whitespace-nowrap">{formatCell(row[xKey])}</p>
                <p className="ms-auto flex-shrink-0 whitespace-nowrap">{formatCell(row[yKey])}</p>
              </div>
            ))}
          </div>
          <MeridianDonutChart
            className="my-auto w-1/2"
            ariaLabel={title ?? "donut chart"}
            totalLabel={totalLabel}
            offsetX={3}
            thickness={10}
            textOffsetX={6.5}
            sectors={rows.map((row, index) => ({
              color: MERIDIAN_DONUT_COLORS[index % MERIDIAN_DONUT_COLORS.length],
              value: Number(row[yKey] ?? 0),
              label: formatCell(row[xKey]),
            }))}
          />
        </div>
      ) : chartType === "bar" ? (
        <MeridianBarChart
          className="mt-4"
          ariaLabel={title ?? "bar chart"}
          points={points}
          xLabels={xLabels}
          colors={seriesColors}
          aspectRatio={aspectRatio}
        />
      ) : (
        <MeridianLineChart
          className="mt-4"
          ariaLabel={title ?? "line chart"}
          points={points}
          xLabels={xLabels}
          colors={seriesColors}
          aspectRatio={aspectRatio}
        />
      )}
    </section>
  );
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
}

export interface KanbanCardItem {
  id: string;
  columnId: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  badge?: string;
  route?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface KanbanBoardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  dataSource?: string;
  columns?: KanbanColumn[];
  rows?: KanbanCardItem[];
  emptyMessage?: string;
  onCardClick?: (card: KanbanCardItem) => void;
}

export function KanbanBoard({
  title,
  dataSource: _dataSource,
  columns = [],
  rows = [],
  emptyMessage = "No items in this board",
  onCardClick,
  ...props
}: KanbanBoardProps) {
  return (
    /*
     * Kanban is a Pipeline CRM surface rather than a Meridian one, so there is no upstream class
     * list to copy — it is rebuilt in the same visual language instead: flat gray-25 columns,
     * hairline gray-200 dividers, `rounded` cards and no drop shadows.
     */
    <section {...props} className={cn("flex flex-col p-4", props.className)}>
      {title && (
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="text-sm text-gray-600 dark:text-gray-500">{rows.length} records</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-flow-col md:auto-cols-fr">
        {columns.map((col) => {
          const colCards = rows.filter((r) => r.columnId === col.id);
          return (
            <div key={col.id} className="flex flex-col rounded-md border border-gray-200 bg-gray-25 p-3 dark:border-gray-800 dark:bg-gray-890">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: col.color ?? "#7c7c7c" }} />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{col.title}</span>
                </div>
                <span className="pill bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {colCards.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {colCards.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-600 dark:text-gray-500">{emptyMessage}</div>
                ) : (
                  colCards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => onCardClick?.(card)}
                      className={cn(
                        "rounded-md border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-875 dark:hover:bg-gray-850",
                        card.route || onCardClick ? "cursor-pointer" : ""
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-base font-medium text-gray-900 dark:text-gray-100">{card.title}</span>
                        {card.badge && (
                          <span className="pill flex-shrink-0 bg-gray-200 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                            {card.badge}
                          </span>
                        )}
                      </div>
                      {card.subtitle && <p className="mt-1 text-sm text-gray-600 dark:text-gray-500">{card.subtitle}</p>}
                      {card.value !== undefined && (
                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-25">{String(card.value)}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export interface TreeNodeItem {
  id: string;
  label: string;
  value?: string | number;
  badge?: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  children?: TreeNodeItem[];
  route?: string;
  [key: string]: unknown;
}

export interface TreeViewProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  dataSource?: string;
  items?: TreeNodeItem[];
  rows?: TreeNodeItem[];
  emptyMessage?: string;
  onNodeClick?: (node: TreeNodeItem) => void;
}

function TreeNode({
  node,
  level = 0,
  onNodeClick,
}: {
  node: TreeNodeItem;
  level?: number;
  onNodeClick?: (node: TreeNodeItem) => void;
}) {
  const [expanded, setExpanded] = useState(node.defaultExpanded ?? true);
  const hasChildren = Boolean(node.children && node.children.length > 0);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          // pages/ChartOfAccounts: rows are `h-row-mid + 1px` tall,
          // indented by `calc(1rem + 2rem * level)`, divided by a border rather than nested
          // in a bordered box, and the root level is one step larger (`text-lg`).
          "flex flex-shrink-0 items-center justify-between border-b border-gray-200 pe-4 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-890",
          level === 0 ? "text-lg" : "text-base",
          node.route || onNodeClick ? "cursor-pointer" : ""
        )}
        style={{ height: "calc(var(--h-row-mid) + 1px)", paddingLeft: `calc(1rem + 2rem * ${level})` }}
        onClick={() => {
          if (hasChildren) {
            setExpanded(!expanded);
          }
          onNodeClick?.(node);
        }}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 text-center text-xs text-gray-500 dark:text-gray-600">
            {hasChildren ? (expanded ? "▾" : "▸") : ""}
          </span>
          <span className={cn("text-gray-900 dark:text-gray-25", level === 0 && "font-semibold")}>{node.label}</span>
          {node.subtitle && <span className="text-sm text-gray-600 dark:text-gray-500">({node.subtitle})</span>}
        </div>
        <div className="flex items-center gap-3">
          {node.badge && (
            <span className="pill bg-gray-200 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {node.badge}
            </span>
          )}
          {node.value !== undefined && (
            <span className="text-base text-gray-900 dark:text-gray-25">{String(node.value)}</span>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="flex flex-col">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} onNodeClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeView({
  title,
  dataSource: _dataSource,
  items,
  rows,
  emptyMessage = "No tree data",
  onNodeClick,
  ...props
}: TreeViewProps) {
  const treeItems = items ?? rows ?? [];

  return (
    <section {...props} className={cn("flex flex-col text-base", props.className)}>
      {title && (
        <h3 className="h-row-mid flex flex-shrink-0 items-center border-b border-gray-200 px-4 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
          {title}
        </h3>
      )}
      {treeItems.length === 0 ? (
        <div className="py-8 text-center text-base text-gray-600 dark:text-gray-500">{emptyMessage}</div>
      ) : (
        <div className="custom-scroll flex flex-col overflow-y-auto">
          {treeItems.map((item) => (
            <TreeNode key={item.id} node={item} level={0} onNodeClick={onNodeClick} />
          ))}
        </div>
      )}
    </section>
  );
}

function formatCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/*
 * Chrome widgets (roadmap steps 4–5): Sidebar/Navbar/Toolbar are semantic, styled
 * containers — no behavior/state of their own, same pattern as Row/Column but with
 * a real landmark element and a sensible default layout (overridable via JSON
 * `style`, because `cn`'s twMerge drops conflicting classes). Drawer/Panel (further
 * down in this file) are the state-controlled overlays from roadmap step 5.
 */

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

/** Sidebar — 14rem wide, gray-25, 0.5rem vertical inset. */
export function Sidebar({ children, ...props }: SidebarProps) {
  return (
    <aside
      {...props}
      className={cn("w-sidebar flex h-full flex-col bg-gray-25 py-2 dark:bg-gray-900", props.className)}
    >
      {children}
    </aside>
  );
}

export interface NavbarProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

/**
 * PageHeader — the 4rem (`h-row-largest`) page header:
 * `px-4`, title and left slot on the start edge with `gap-4`, actions on the end edge with
 * `gap-2`, one hairline rule underneath.
 */
export function Navbar({ children, ...props }: NavbarProps) {
  return (
    <nav
      {...props}
      className={cn(
        "h-row-largest flex flex-shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-4 dark:border-gray-800 dark:bg-gray-875",
        props.className,
      )}
    >
      {children}
    </nav>
  );
}

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Toolbar({ children, ...props }: ToolbarProps) {
  return (
    <div {...props} role="toolbar" className={cn("flex items-center gap-2", props.className)}>
      {children}
    </div>
  );
}

/*
 * Overlay chrome (roadmap step 5): Drawer/Panel are controlled overlays with real behavior —
 * escape-to-close, backdrop-click-to-close, and a minimal focus trap (Tab/Shift+Tab inside
 * the open container, focus moved in on open and restored on close). Deliberately NOT built
 * on the action-triggered Dialog/Snackbar path: per the roadmap, documents control these via
 * props bound to state (`open: { "$bind": "state.overlays.x" }`) and forward `onClose` to the
 * ActionInterpreter (a `setState` action), so multiple overlays coexist via the state-key
 * naming convention `state.overlays.<name>` (documented in the README).
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Open overlays, most recently opened last. Escape closes only the top-most one, so several
 * overlays (e.g. a Dialog and a Drawer) can be open at once and one Escape closes just the
 * top one instead of all of them.
 */
const openOverlays: Array<{ close: () => void }> = [];

/**
 * Shared overlay behavior for Drawer/Panel: while `open`, moves focus into the container,
 * closes on Escape, traps Tab/Shift+Tab inside the container, and restores focus to the
 * previously-focused element when the overlay closes. Escape closes only the top-most open
 * overlay (see `openOverlays`); the Tab trap is per-overlay and only acts when focus is
 * actually inside its own container, so it doesn't interfere with overlays below.
 */
function useOverlayBehavior(
  open: boolean | undefined,
  onClose: (() => void) | undefined,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  // Keep the latest onClose without re-running the effect — re-running would pop and re-push
  // this overlay's stack entry, silently re-ordering it above overlays that opened later.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const entry = { close: () => closeRef.current?.() };
    openOverlays.push(entry);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Only the top-most open overlay closes on Escape.
        if (openOverlays[openOverlays.length - 1] === entry) {
          entry.close();
        }
        return;
      }
      if (e.key !== "Tab" || !container) return;

      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || active === container)) {
        e.preventDefault();
        first.focus();
      }
    };

    // Move focus into the overlay so keyboard interaction starts inside it (the container is
    // tabIndex={-1}, so this is programmatic focus — it doesn't add a tab stop).
    container?.focus();
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const index = openOverlays.indexOf(entry);
      if (index >= 0) openOverlays.splice(index, 1);
      previouslyFocused?.focus();
    };
  }, [open, containerRef]);
}

export interface DrawerProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onClose?: () => void;
  title?: string;
  /** Which screen edge the drawer slides from. Defaults to "right". */
  side?: "left" | "right" | "top" | "bottom";
  /** Show the dimming backdrop (click-to-close). Defaults to true. */
  backdrop?: boolean;
  children?: ReactNode;
}

/** Side strip + the one border that joins the panel to the page, as QuickEditForm does. */
const DRAWER_SIDE_CLASSES: Record<NonNullable<DrawerProps["side"]>, string> = {
  left: "inset-y-0 left-0 w-80 border-e",
  right: "inset-y-0 right-0 w-80 border-s",
  top: "inset-x-0 top-0 h-80 border-b",
  bottom: "inset-x-0 bottom-0 h-80 border-t",
};

/** Off-screen starting translate per drawer side — the slide always comes from the screen edge. */
const DRAWER_START_TRANSLATE: Record<NonNullable<DrawerProps["side"]>, string> = {
  left: "-translate-x-full",
  right: "translate-x-full",
  top: "-translate-y-full",
  bottom: "translate-y-full",
};

/*
 * Motion tokens (per the workspace motion-design skill): entrance 300ms / exit 200ms (exits
 * shorter than entrances), ease-out, transform+opacity only — nothing layout-affecting is
 * animated. prefers-reduced-motion short-circuits useOverlayPresence (instant show/hide), so
 * these classes never matter for reduced-motion users.
 */
const OVERLAY_EXIT_MS = 200;

/** Motion classes per phase — the exit transition is deliberately shorter than the entrance. */
function overlayMotionClasses(closing: boolean): { surface: string; fade: string } {
  const duration = closing ? "duration-200" : "duration-300";
  return {
    surface: `transition-transform ${duration} ease-out`,
    fade: `transition-opacity ${duration} ease-out`,
  };
}

/*
 * requestAnimationFrame is not universally available (e.g. jsdom without pretendToBeVisual,
 * which is what the vitest suite runs on) — fall back to a 16ms timer so the double-frame
 * sequencing in useOverlayPresence still works there. Real browsers use rAF.
 */
const nextFrame =
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame
    : (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 16);
const cancelFrame =
  typeof cancelAnimationFrame === "function"
    ? cancelAnimationFrame
    : (id: number) => window.clearTimeout(id);

/**
 * Keeps an overlay mounted through its exit transition: mounts instantly when `open` flips
 * true (start state, then flips to the end state after a double rAF so the browser paints
 * the off-screen state first), and when `open` flips false it stays mounted for
 * `OVERLAY_EXIT_MS` (start state re-applied, CSS transition plays) before unmounting.
 * `closing` tells the renderer which state to apply. Interruptible: re-opening mid-exit
 * cancels the pending unmount timer. Skips the animation entirely under
 * `prefers-reduced-motion` (instant show/hide).
 */
function useOverlayPresence(open: boolean | undefined): { mounted: boolean; closing: boolean; entered: boolean } {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!open) return;
    }

    /* eslint-disable react-hooks/set-state-in-effect -- presence gating is the documented
     * modal-enter/exit pattern (react.dev/learn/you-might-not-need-an-effect, "Example:
     * controlling a modal" does the same synchronous state flip to stay mounted through the
     * exit transition). These flips synchronize React with DOM mount/unmount timing for the
     * CSS transitions — they are not derived data that could be computed during render. */
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    if (open) {
      setMounted(true);
      setClosing(false);
      if (reduced) {
        setEntered(true);
        return;
      }
      // Entering: render the start state first, then flip to the end state after the next
      // animation frame so the CSS transition runs cleanly.
      setEntered(false);
      const raf = nextFrame(() => {
        setEntered(true);
      });
      return () => {
        cancelFrame(raf);
      };
    }

    // Closing: re-apply the start state, keep mounted until the exit transition finishes.
    setEntered(false);
    setClosing(true);
    if (reduced) {
      setMounted(false);
      setClosing(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, OVERLAY_EXIT_MS);
    return () => window.clearTimeout(timer);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  return { mounted, closing, entered };
}

export function Drawer({ open, onClose, title, side = "right", backdrop = true, children, ...props }: DrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Engage the overlay behavior only while the overlay is actually in the DOM: mounting is
  // deferred by one commit (useOverlayPresence flips `mounted` after the first render), so
  // gating on `open` alone would run the effect before the container ref is attached.
  const { mounted, closing, entered } = useOverlayPresence(open);
  useOverlayBehavior(open && mounted, onClose, containerRef);

  if (!mounted) return null;

  const motion = overlayMotionClasses(closing);
  const atRest = !closing && entered;
  const translate = atRest ? "translate-x-0 translate-y-0" : DRAWER_START_TRANSLATE[side];
  const fade = atRest ? "opacity-100" : "opacity-0";

  return (
    <div className="meridian-overlay pointer-events-none fixed inset-0 z-50">
      {backdrop && (
        <div
          // Meridian's `.backdrop` (src/styles/index.css): 10% black plus a 2px blur, not a scrim.
          // The attribute is the stable hook for tests — the class list is presentation.
          data-overlay-backdrop=""
          className={cn("pointer-events-auto absolute inset-0 bg-black/10 backdrop-blur-[2px]", motion.fade, fade)}
          onClick={onClose}
        />
      )}
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        {...props}
        className={cn(
          // Meridian's closest equivalent is the quick-edit pane (QuickEditForm): a plain
          // white surface joined to the page by one border, with a `h-row-large` title bar
          // in FormHeader's `text-xl font-semibold` — not a floating card.
          "pointer-events-auto fixed flex flex-col border-gray-200 bg-white shadow-md outline-none dark:border-gray-800 dark:bg-gray-890",
          motion.surface,
          DRAWER_SIDE_CLASSES[side],
          translate,
          closing && "pointer-events-none",
          props.className,
        )}
      >
        {title && (
          <h3 className="h-row-large flex flex-shrink-0 items-center border-b border-gray-200 px-4 text-xl font-semibold dark:border-gray-800 dark:text-gray-25">
            {title}
          </h3>
        )}
        <div className="custom-scroll flex-1 overflow-y-auto p-4 text-base">{children}</div>
      </div>
    </div>
  );
}

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onClose?: () => void;
  /** Show the dimming backdrop (click-to-close). Defaults to true. */
  backdrop?: boolean;
  children?: ReactNode;
}

export function Panel({ open, onClose, backdrop = true, children, ...props }: PanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Same deferral handling as Drawer — behavior engages only while the overlay is mounted.
  const { mounted, closing, entered } = useOverlayPresence(open);
  useOverlayBehavior(open && mounted, onClose, containerRef);

  if (!mounted) return null;

  const motion = overlayMotionClasses(closing);
  const atRest = !closing && entered;
  const fade = atRest ? "opacity-100" : "opacity-0";

  return (
    <div className="pointer-events-none fixed inset-0">
      {backdrop && (
        <div
          // Meridian's `.backdrop` (src/styles/index.css): 10% black plus a 2px blur, not a scrim.
          // The attribute is the stable hook for tests — the class list is presentation.
          data-overlay-backdrop=""
          className={cn("pointer-events-auto absolute inset-0 bg-black/10 backdrop-blur-[2px]", motion.fade, fade)}
          onClick={onClose}
        />
      )}
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        {...props}
        className={cn(
          "meridian-overlay pointer-events-auto fixed inset-0 flex items-center justify-center",
          motion.fade,
          fade,
          closing && "pointer-events-none",
          props.className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onClose?: () => void;
  /** Which edge the panel hangs from. Meridian's FilterDropdown is `bottom-end`. */
  align?: "start" | "end";
  children?: ReactNode;
}

/**
 * Popover, as Meridian actually uses it: a panel anchored to
 * the control that opened it, not a centred modal.
 *
 * Deliberately *not* portalled. Meridian wraps trigger and panel in one `relative` element and
 * positions the panel absolutely inside it (ListView's FilterDropdown, the Create dropdown),
 * which needs no anchor math and keeps the panel inside the same stacking and shadow-root
 * context as its trigger. A document places this node next to its trigger inside a container
 * styled `position: relative`.
 *
 * Escape and click-outside close it through the same overlay stack the Drawer and Panel use, so
 * a popover opened above a drawer still closes in the right order.
 */
export function Popover({ open, onClose, align = "end", children, ...props }: PopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useOverlayBehavior(open, onClose, containerRef);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const target = event.target as Node | null;
      // The trigger is a sibling, so a click on it must not close-then-reopen: the trigger's
      // own handler toggles state, and closing here first would make it look inert.
      if (target && (container.contains(target) || container.parentElement?.contains(target))) return;
      onClose?.();
    };
    document.addEventListener("mousedown", onPointerDown, true);
    return () => document.removeEventListener("mousedown", onPointerDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      {...props}
      // The edge offset is an inline style, not a `start-0`/`end-0` utility: those are the only
      // logical-inset classes this bundle would need, Tailwind's scanner never emitted them, and
      // the panel silently fell back to its static position and hung off the right of the page.
      style={{ ...(align === "end" ? { insetInlineEnd: 0 } : { insetInlineStart: 0 }), ...props.style }}
      className={cn(
        "meridian-overlay absolute top-full z-10 mt-1 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-890",
        props.className,
      )}
    >
      {children}
    </div>
  );
}

export interface SnackbarProps extends HTMLAttributes<HTMLDivElement> {
  message?: string;
  duration?: number;
  onClose?: () => void;
  /** Leading outline icon. Toasts read as confirmations, so a check is the default. */
  iconName?: string;
}

export function Snackbar({ message, duration = 3000, onClose, iconName = "check-circle", ...props }: SnackbarProps) {
  useEffect(() => {
    if (!message || !onClose) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      {...props}
      role="status"
      aria-live="polite"
      className={cn(
        // Toast + App's #toast-container: a 24rem
        // white card, bordered and rounded-lg, pinned to the bottom end edge (`mb-3 pe-6`).
        "w-toast fixed right-6 bottom-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-lg dark:border-gray-800 dark:bg-gray-850 dark:text-gray-25",
        props.className,
      )}
    >
      {iconName && <Icon name={iconName} className="h-5 w-5 flex-shrink-0 text-green-500" />}
      <span className="min-w-0 flex-1">{message}</span>
    </div>
  );
}

export interface DialogProps extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  title?: string;
  content?: ReactNode;
  open?: boolean;
  onClose?: () => void;
}

export function Dialog({ title, content, open, onClose, ...props }: DialogProps) {
  // Same presence/motion story as Drawer/Panel: fade in on show, fade out on close. Snackbar
  // stays instant on purpose — it's a transient, timer-managed notification where an exit
  // transition would fight the auto-dismiss timing.
  const { mounted, closing, entered } = useOverlayPresence(open);

  if (!mounted) return null;

  const motion = overlayMotionClasses(closing);
  const fade = !closing && entered ? "opacity-100" : "opacity-0";

  return (
    /*
     * Modal: the `.backdrop` utility (10% black + a 2px
     * blur, not a 50% scrim), and a bordered `rounded-lg shadow-2xl` surface at `w-dialog`
     * (24rem). The title bar follows FormHeader.
     */
    <div className={cn("backdrop meridian-overlay z-50 flex items-center justify-center", motion.fade, fade)}>
      <div data-overlay-backdrop="" className="absolute inset-0" onClick={onClose} />
      <div
        {...props}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-dialog relative z-10 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-850",
          props.className,
        )}
      >
        {title && (
          <h3 className="h-row-large flex items-center border-b border-gray-200 px-4 text-xl font-semibold dark:border-gray-800 dark:text-gray-25">
            {title}
          </h3>
        )}
        <div className="px-4 py-4 text-base text-gray-900 dark:text-gray-200">{content}</div>
        <div className="flex justify-end border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
