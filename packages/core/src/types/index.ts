export interface UIDLDocument {
  $schema?: string;
  version: string;
  id: string;
  name: string;
  route?: string;
  theme?: string;
  state?: Record<string, unknown>;
  dataSources?: Record<string, unknown>;
  /**
   * Named, reusable node sub-trees ("component templates"). A node with `componentId: "X"`
   * instantiates `definitions.X` at render time — see `renderer/instantiateComponent.ts`.
   */
  definitions?: Record<string, UIDLNode>;
  root: UIDLNode;
}

export interface UIDLNode {
  id: string;
  type: string;
  name?: string;
  props?: Record<string, unknown>;
  style?: Record<string, unknown>;
  children?: UIDLNode[];
  slots?: Record<string, UIDLNode[]>;
  responsive?: Record<string, unknown>;
  visibility?: Record<string, unknown>;
  bindings?: Record<string, unknown>;
  events?: Record<string, unknown>;
  repeat?: Record<string, unknown>;
  ref?: string;
  componentId?: string;
  themeRef?: string;
  testId?: string;
}

export interface DesignTokens {
  color?: Record<string, string>;
  font?: Record<string, string>;
  spacing?: Record<string, string>;
  radius?: Record<string, string>;
  shadow?: Record<string, unknown>;
}

export interface WidgetManifest<TProps = Record<string, unknown>> {
  type: string;
  component: React.ComponentType<TProps>;
  category: "layout" | "base" | "form" | "data" | "navigation" | "advanced";
  acceptsChildren: boolean;
  defaultProps?: Partial<TProps>;
  propDescriptors?: ComponentPropDescriptor[];
  propSchema?: Record<string, unknown>;
  slots?: string[];
  events?: string[];
  eventDescriptors?: ComponentEventDescriptor[];
  /**
   * Hide from the Editor's WidgetPalette (Round 15). Chrome widgets like Sidebar/Navbar/
   * Toolbar/Drawer/Panel are part of the document vocabulary and still fully renderable
   * from JSON — they just aren't meant to be drag-dropped into a canvas by authors.
   * Absent = visible, same as before this flag existed.
   */
  hideFromPalette?: boolean;
  toTailwind?: (props: TProps, style?: Record<string, unknown>) => string;
}

export type ComponentPropType = "string" | "number" | "boolean" | "enum" | "array" | "object" | "node";

export interface ComponentPropDescriptor {
  name: string;
  type: ComponentPropType;
  description?: string;
  values?: readonly string[];
  required?: boolean;
  bindable?: boolean;
}

export interface ComponentEventDescriptor {
  name: string;
  description?: string;
  payload?: "value" | "rowAction" | "card" | "node" | "submit" | "close" | "event";
}

export interface ComponentRegistry {
  get(type: string): WidgetManifest | undefined;
  register(manifest: WidgetManifest): void;
  has(type: string): boolean;
  list(): WidgetManifest[];
}

export type {
  Theme,
  ThemePreset,
  PrimitiveTokens,
  SemanticTokens,
  TypographyToken,
  ComponentVariant,
  StyleIntent,
  ResponsiveValue,
} from "./theme";
