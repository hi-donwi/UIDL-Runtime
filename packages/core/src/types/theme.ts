export interface ResponsiveValue<T> {
  base?: T;
  [breakpoint: string]: T | undefined;
}

export interface PrimitiveTokens {
  color: Record<string, string>;
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  font: Record<string, string>;
  border: Record<string, string>;
}

export interface SemanticTokens {
  color: Record<string, string>;
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  typography: Record<string, TypographyToken>;
}

export interface TypographyToken {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number | string;
  lineHeight?: string;
  letterSpacing?: string;
}

export interface ComponentVariant {
  name: string;
  props?: Record<string, unknown>;
  style?: StyleIntent;
  className?: string;
}

export type StyleIntent = {
  gap?: string | ResponsiveValue<string>;
  padding?: string | ResponsiveValue<string>;
  paddingTop?: string | ResponsiveValue<string>;
  paddingRight?: string | ResponsiveValue<string>;
  paddingBottom?: string | ResponsiveValue<string>;
  paddingLeft?: string | ResponsiveValue<string>;
  margin?: string | ResponsiveValue<string>;
  marginTop?: string | ResponsiveValue<string>;
  marginRight?: string | ResponsiveValue<string>;
  marginBottom?: string | ResponsiveValue<string>;
  marginLeft?: string | ResponsiveValue<string>;
  width?: string | ResponsiveValue<string>;
  height?: string | ResponsiveValue<string>;
  minWidth?: string | ResponsiveValue<string>;
  maxWidth?: string | ResponsiveValue<string>;
  minHeight?: string | ResponsiveValue<string>;
  maxHeight?: string | ResponsiveValue<string>;
  flexDirection?:
    | "row"
    | "column"
    | "row-reverse"
    | "column-reverse"
    | ResponsiveValue<"row" | "column" | "row-reverse" | "column-reverse">;
  justifyContent?:
    | "start"
    | "center"
    | "end"
    | "space-between"
    | "space-around"
    | "space-evenly"
    | ResponsiveValue<
        | "start"
        | "center"
        | "end"
        | "space-between"
        | "space-around"
        | "space-evenly"
      >;
  alignItems?:
    | "start"
    | "center"
    | "end"
    | "stretch"
    | "baseline"
    | ResponsiveValue<"start" | "center" | "end" | "stretch" | "baseline">;
  display?: string | ResponsiveValue<string>;
  position?:
    | "static"
    | "relative"
    | "absolute"
    | "fixed"
    | "sticky"
    | ResponsiveValue<"static" | "relative" | "absolute" | "fixed" | "sticky">;
  /** Shorthand for top/right/bottom/left together (Tailwind's `inset-*` utilities). */
  inset?: string | ResponsiveValue<string>;
  top?: string | ResponsiveValue<string>;
  right?: string | ResponsiveValue<string>;
  bottom?: string | ResponsiveValue<string>;
  left?: string | ResponsiveValue<string>;
  zIndex?: number | ResponsiveValue<number>;
  background?: string | ResponsiveValue<string>;
  color?: string | ResponsiveValue<string>;
  fontSize?: string | ResponsiveValue<string>;
  fontWeight?: number | string | ResponsiveValue<number | string>;
  lineHeight?: string | ResponsiveValue<string>;
  letterSpacing?: string | ResponsiveValue<string>;
  borderRadius?: string | ResponsiveValue<string>;
  borderWidth?: string | ResponsiveValue<string>;
  borderColor?: string | ResponsiveValue<string>;
  shadow?: string | ResponsiveValue<string>;
  opacity?: number | ResponsiveValue<number>;
  /**
   * A semantic typography token reference (e.g. `"{semantics.typography.headline-medium}"`),
   * applying that token's fontFamily/fontSize/fontWeight/lineHeight/letterSpacing together.
   * Not responsive — a single typography token per node.
   */
  typography?: string;
};

export interface Theme {
  id: string;
  name: string;
  mode: "light" | "dark";
  breakpoints: Record<string, string>;
  primitives: PrimitiveTokens;
  semantics: SemanticTokens;
  variants: Record<string, ComponentVariant[]>;
}

export interface ThemePreset {
  id: string;
  label: string;
  mode: "light" | "dark";
  theme: Theme;
}
