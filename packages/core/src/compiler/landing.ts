/**
 * Public landing-page recipe — a marketing page assembled from sections.
 *
 * A page is a brand bar, an ordered list of sections, and a footer. Each section kind is a
 * preset with its own small meta: hero, features, pricing, testimonials, faq, cta, and signup.
 * Only `signup` talks to the host, through one allowlisted command; the rest is static text and
 * navigation, so a website can be produced from metadata alone.
 *
 * Like `compileAuthPage`, this sits beside the seven `PageRecipe` values rather than among
 * them (ADR-0010): the Java generator mirrors those seven.
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import type { HostCapabilities, LocalizedText, UiPolicy } from "./types.js";

export interface LandingAction {
  label: LocalizedText;
  route: string;
}

export interface HeroSection {
  kind: "hero";
  id: string;
  badge?: LocalizedText;
  title: LocalizedText;
  subtitle?: LocalizedText;
  primary?: LandingAction;
  secondary?: LandingAction;
  image?: string;
}

export interface FeaturesSection {
  kind: "features";
  id: string;
  title?: LocalizedText;
  items: Array<{ title: LocalizedText; body: LocalizedText; icon?: string }>;
}

export interface PricingSection {
  kind: "pricing";
  id: string;
  title?: LocalizedText;
  plans: Array<{
    name: LocalizedText;
    price: string;
    period?: LocalizedText;
    features: LocalizedText[];
    action: LandingAction;
    highlighted?: boolean;
  }>;
}

export interface TestimonialsSection {
  kind: "testimonials";
  id: string;
  title?: LocalizedText;
  items: Array<{ quote: LocalizedText; author: string; role?: LocalizedText }>;
}

export interface FaqSection {
  kind: "faq";
  id: string;
  title?: LocalizedText;
  items: Array<{ question: LocalizedText; answer: LocalizedText }>;
}

export interface CtaSection {
  kind: "cta";
  id: string;
  title: LocalizedText;
  body?: LocalizedText;
  action: LandingAction;
}

/** Collects an email address and hands it to a host command, such as a newsletter sign-up. */
export interface SignupSection {
  kind: "signup";
  id: string;
  title: LocalizedText;
  body?: LocalizedText;
  /** Must be in `hostCapabilities.commands`. */
  command: string;
  submitLabel?: LocalizedText;
  successMessage?: LocalizedText;
}

export type LandingSection =
  | HeroSection
  | FeaturesSection
  | PricingSection
  | TestimonialsSection
  | FaqSection
  | CtaSection
  | SignupSection;

export const LANDING_SECTION_KINDS = ["hero", "features", "pricing", "testimonials", "faq", "cta", "signup"] as const;

export interface LandingPageMeta {
  name: string;
  brand: { name: string; logo?: string };
  nav?: LandingAction[];
  /** The one emphasised button in the top bar, such as "Start free". */
  navAction?: LandingAction;
  sections: LandingSection[];
  footer?: { text: LocalizedText; links?: LandingAction[] };
  route?: string;
}

export interface CompileLandingOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  docId?: string;
}

const BORDER_COLOR = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";
const SECTION_STYLE = { display: "flex", flexDirection: "column", gap: "gap-6", padding: "px-6 py-16", width: "w-full" } as const;
const GRID_STYLE = { display: "grid grid-cols-1 md:grid-cols-3", gap: "gap-6", width: "w-full" } as const;
const CARD_STYLE = { display: "flex", flexDirection: "column", gap: "gap-3", padding: "p-6", borderWidth: "border", borderColor: BORDER_COLOR, borderRadius: "rounded-xl" } as const;

/** Section ids become node ids and state keys, so they are plain identifiers. */
const SECTION_ID = /^[A-Za-z][A-Za-z0-9]*$/;

export function compileLandingPage(meta: LandingPageMeta, options: CompileLandingOptions): UIDLDocument {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const [index, section] of meta.sections.entries()) {
    if (!(LANDING_SECTION_KINDS as readonly string[]).includes(section.kind)) {
      problems.push(`meta.sections.${index}: unknown kind "${String(section.kind)}"`);
    }
    if (!SECTION_ID.test(section.id)) {
      problems.push(`meta.sections.${index}: id "${section.id}" must be letters and digits, starting with a letter`);
    } else if (seen.has(section.id)) {
      problems.push(`meta.sections.${index}: id "${section.id}" is used twice`);
    }
    seen.add(section.id);
    if (section.kind === "signup" && !options.hostCapabilities.commands.includes(section.command)) {
      problems.push(`meta.sections.${index}.command: command "${section.command}" is not in hostCapabilities.commands`);
    }
  }
  if (problems.length > 0) throw new Error(`compileLandingPage: ${problems.join("; ")}`);

  const lang: Language = options.uiPolicy?.lang ?? "id";
  const say = (value: LocalizedText) => value[lang] ?? value.en;
  const prefix = `landing-${meta.name}`;
  const state: Record<string, unknown> = {};

  const button = (id: string, action: LandingAction, variant: "primary" | "secondary"): UIDLNode => ({
    id,
    type: "Button",
    props: { label: say(action.label), variant },
    events: { onClick: [{ navigate: { route: action.route } }] },
  });
  const heading = (id: string, value: LocalizedText, level: 1 | 2 | 3 = 2): UIDLNode => ({
    id,
    type: "Text",
    props: { value: say(value), heading: level },
    style: { fontSize: level === 1 ? "text-5xl" : level === 2 ? "text-3xl" : "text-xl", fontWeight: 700 },
  });
  const paragraph = (id: string, value: LocalizedText): UIDLNode => ({
    id,
    type: "Text",
    props: { value: say(value) },
    style: { color: TEXT_SECONDARY },
  });

  const sectionNode = (section: LandingSection): UIDLNode => {
    const at = `${prefix}-${section.id}`;
    const children: UIDLNode[] = [];
    switch (section.kind) {
      case "hero": {
        if (section.badge) children.push({ id: `${at}-badge`, type: "Badge", props: { label: say(section.badge), variant: "pill", color: "blue" } });
        children.push(heading(`${at}-title`, section.title, 1));
        if (section.subtitle) children.push(paragraph(`${at}-subtitle`, section.subtitle));
        const actions = [
          ...(section.primary ? [button(`${at}-primary`, section.primary, "primary")] : []),
          ...(section.secondary ? [button(`${at}-secondary`, section.secondary, "secondary")] : []),
        ];
        if (actions.length > 0) children.push({ id: `${at}-actions`, type: "Row", style: { gap: "gap-3" }, children: actions });
        if (section.image) children.push({ id: `${at}-image`, type: "Image", props: { src: section.image, alt: say(section.title) }, style: { width: "w-full", borderRadius: "rounded-xl" } });
        return { id: at, type: "Column", style: { ...SECTION_STYLE, alignItems: "center", padding: "px-6 py-24" }, children };
      }
      case "features": {
        if (section.title) children.push(heading(`${at}-title`, section.title));
        children.push({
          id: `${at}-grid`,
          type: "GridView",
          style: GRID_STYLE,
          children: section.items.map((item, i) => ({
            id: `${at}-item-${i}`,
            type: "Column",
            style: CARD_STYLE,
            children: [
              ...(item.icon ? [{ id: `${at}-item-${i}-icon`, type: "Icon", props: { name: item.icon } } as UIDLNode] : []),
              heading(`${at}-item-${i}-title`, item.title, 3),
              paragraph(`${at}-item-${i}-body`, item.body),
            ],
          })),
        });
        return { id: at, type: "Column", style: SECTION_STYLE, children };
      }
      case "pricing": {
        if (section.title) children.push(heading(`${at}-title`, section.title));
        children.push({
          id: `${at}-plans`,
          type: "GridView",
          style: GRID_STYLE,
          children: section.plans.map((plan, i) => ({
            id: `${at}-plan-${i}`,
            type: "Column",
            style: { ...CARD_STYLE, ...(plan.highlighted ? { borderColor: "{primitives.color.primary}", shadow: "shadow-lg" } : {}) },
            children: [
              heading(`${at}-plan-${i}-name`, plan.name, 3),
              {
                id: `${at}-plan-${i}-price`,
                type: "Text",
                props: { value: plan.period ? `${plan.price} / ${say(plan.period)}` : plan.price },
                style: { fontSize: "text-3xl", fontWeight: 700 },
              },
              ...plan.features.map((feature, j) => paragraph(`${at}-plan-${i}-feature-${j}`, feature)),
              button(`${at}-plan-${i}-action`, plan.action, plan.highlighted ? "primary" : "secondary"),
            ],
          })),
        });
        return { id: at, type: "Column", style: SECTION_STYLE, children };
      }
      case "testimonials": {
        if (section.title) children.push(heading(`${at}-title`, section.title));
        children.push({
          id: `${at}-grid`,
          type: "GridView",
          style: GRID_STYLE,
          children: section.items.map((item, i) => ({
            id: `${at}-item-${i}`,
            type: "Column",
            style: CARD_STYLE,
            children: [
              { id: `${at}-item-${i}-quote`, type: "Text", props: { value: `"${say(item.quote)}"` } },
              {
                id: `${at}-item-${i}-author`,
                type: "Text",
                props: { value: item.role ? `${item.author}, ${say(item.role)}` : item.author },
                style: { fontWeight: 600 },
              },
            ],
          })),
        });
        return { id: at, type: "Column", style: SECTION_STYLE, children };
      }
      case "faq": {
        if (section.title) children.push(heading(`${at}-title`, section.title));
        section.items.forEach((item, i) => {
          children.push({
            id: `${at}-item-${i}`,
            type: "Column",
            style: { display: "flex", flexDirection: "column", gap: "gap-1", paddingBottom: "pb-4", borderWidth: "border-b", borderColor: BORDER_COLOR },
            children: [heading(`${at}-item-${i}-question`, item.question, 3), paragraph(`${at}-item-${i}-answer`, item.answer)],
          });
        });
        return { id: at, type: "Column", style: SECTION_STYLE, children };
      }
      case "cta": {
        children.push(heading(`${at}-title`, section.title));
        if (section.body) children.push(paragraph(`${at}-body`, section.body));
        children.push(button(`${at}-action`, section.action, "primary"));
        return { id: at, type: "Column", style: { ...SECTION_STYLE, alignItems: "center" }, children };
      }
      case "signup": {
        const email = `${section.id}Email`;
        const status = `${section.id}Status`;
        const error = `${section.id}Error`;
        state[email] = "";
        state[status] = "idle";
        state[error] = "";
        children.push(heading(`${at}-title`, section.title));
        if (section.body) children.push(paragraph(`${at}-body`, section.body));
        children.push({
          id: `${at}-form`,
          type: "Form",
          style: { display: "flex", flexDirection: "row", gap: "gap-2", width: "w-full", maxWidth: "max-w-md" },
          children: [
            {
              id: `${at}-email`,
              type: "TextField",
              props: { "aria-label": "Email", placeholder: "Email", value: { $bind: `state.${email}` } },
              events: { onChange: [{ setState: { path: email, value: null } }] },
            },
            {
              id: `${at}-submit`,
              type: "Button",
              props: { label: say(section.submitLabel ?? { id: "Daftar", en: "Sign up" }), variant: "primary" },
              events: {
                onClick: [
                  {
                    command: {
                      name: section.command,
                      payload: { email: { $expr: { path: `state.${email}` } }, source: section.id },
                      statusPath: status,
                      errorPath: error,
                      onSuccess: { setState: { path: email, value: "" } },
                    },
                  },
                ],
              },
            },
          ],
        });
        children.push({
          id: `${at}-success`,
          type: "Text",
          props: { value: say(section.successMessage ?? { id: "Terima kasih, kami akan menghubungi Anda.", en: "Thanks, we will be in touch." }) },
          visibility: { condition: { "==": [{ path: `state.${status}` }, { literal: "success" }] } },
        });
        children.push({
          id: `${at}-error`,
          type: "Text",
          props: { value: { $bind: `state.${error}` } },
          style: { color: "{primitives.color.error}" },
          visibility: { condition: { "==": [{ path: `state.${status}` }, { literal: "error" }] } },
        });
        return { id: at, type: "Column", style: { ...SECTION_STYLE, alignItems: "center" }, children };
      }
    }
  };

  const navbar: UIDLNode = {
    id: `${prefix}-navbar`,
    type: "Navbar",
    style: { justifyContent: "space-between", alignItems: "center", padding: "px-6 py-4", borderWidth: "border-b", borderColor: BORDER_COLOR },
    children: [
      {
        id: `${prefix}-brand`,
        type: "Row",
        style: { alignItems: "center", gap: "gap-2" },
        children: [
          ...(meta.brand.logo ? [{ id: `${prefix}-logo`, type: "Image", props: { src: meta.brand.logo, alt: meta.brand.name }, style: { height: "h-8" } } as UIDLNode] : []),
          { id: `${prefix}-brand-name`, type: "Text", props: { value: meta.brand.name }, style: { fontSize: "text-xl", fontWeight: 700 } },
        ],
      },
      {
        id: `${prefix}-nav`,
        type: "Row",
        style: { alignItems: "center", gap: "gap-2" },
        children: [
          ...(meta.nav ?? []).map((item, i) => button(`${prefix}-nav-${i}`, item, "secondary")),
          ...(meta.navAction ? [button(`${prefix}-nav-action`, meta.navAction, "primary")] : []),
        ],
      },
    ],
  };

  const sections = meta.sections.map(sectionNode);

  const footer: UIDLNode[] = meta.footer
    ? [
        {
          id: `${prefix}-footer`,
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", padding: "px-6 py-8", borderWidth: "border-t", borderColor: BORDER_COLOR },
          children: [
            paragraph(`${prefix}-footer-text`, meta.footer.text),
            {
              id: `${prefix}-footer-links`,
              type: "Row",
              style: { gap: "gap-2" },
              children: (meta.footer.links ?? []).map((link, i) => button(`${prefix}-footer-link-${i}`, link, "secondary")),
            },
          ],
        },
      ]
    : [];

  return {
    version: "1.0.0",
    id: options.docId ?? `landing-${meta.name.toLowerCase()}`,
    name: meta.brand.name,
    ...(meta.route ? { route: meta.route } : {}),
    ...(Object.keys(state).length > 0 ? { state } : {}),
    root: {
      id: `${prefix}-page`,
      type: "Column",
      style: { minHeight: "min-h-screen", width: "w-full" },
      children: [navbar, ...sections, ...footer],
    },
  };
}
