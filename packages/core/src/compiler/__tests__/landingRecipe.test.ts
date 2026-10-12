import { describe, expect, it } from "vitest";
import { DocumentSchema } from "../../schemas/document";
import type { UIDLNode } from "../../types";
import { compileLandingPage, type LandingPageMeta } from "../index.js";

const t = (en: string) => ({ id: en, en });
const caps = { collections: [], commands: ["newsletter.subscribe"] };

const meta: LandingPageMeta = {
  name: "home",
  brand: { name: "Atlas" },
  nav: [{ label: t("Pricing"), route: "#pricing" }],
  navAction: { label: t("Start free"), route: "/sign-up" },
  sections: [
    { kind: "hero", id: "hero", badge: t("New"), title: t("Ship faster"), subtitle: t("From one model"), primary: { label: t("Start"), route: "/sign-up" }, secondary: { label: t("Docs"), route: "/docs" } },
    { kind: "features", id: "features", title: t("Why"), items: [{ title: t("Fast"), body: t("Really"), icon: "bolt" }, { title: t("Safe"), body: t("Checked") }] },
    {
      kind: "pricing",
      id: "pricing",
      plans: [
        { name: t("Free"), price: "$0", features: [t("1 project")], action: { label: t("Start"), route: "/sign-up" } },
        { name: t("Pro"), price: "$20", period: t("month"), features: [t("Unlimited")], action: { label: t("Buy"), route: "/checkout" }, highlighted: true },
      ],
    },
    { kind: "testimonials", id: "quotes", items: [{ quote: t("Great"), author: "Ana", role: t("CTO") }] },
    { kind: "faq", id: "faq", items: [{ question: t("Is it free?"), answer: t("Yes") }] },
    { kind: "cta", id: "cta", title: t("Ready?"), action: { label: t("Go"), route: "/sign-up" } },
    { kind: "signup", id: "news", title: t("Stay in touch"), command: "newsletter.subscribe" },
  ],
  footer: { text: t("(c) Atlas"), links: [{ label: t("Privacy"), route: "/privacy" }] },
};

function find(node: UIDLNode, id: string): UIDLNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const hit = find(child, id);
    if (hit) return hit;
  }
  return undefined;
}

const ids = (node: UIDLNode): string[] => [node.id, ...(node.children ?? []).flatMap(ids)];

describe("compileLandingPage", () => {
  it("lays out a top bar, every section in order, and a footer", () => {
    const doc = compileLandingPage(meta, { hostCapabilities: caps, uiPolicy: { lang: "en" } });
    expect(doc.root.children?.map((n) => n.id)).toEqual([
      "landing-home-navbar",
      "landing-home-hero",
      "landing-home-features",
      "landing-home-pricing",
      "landing-home-quotes",
      "landing-home-faq",
      "landing-home-cta",
      "landing-home-news",
      "landing-home-footer",
    ]);
    expect(find(doc.root, "landing-home-nav-action")?.events?.onClick).toEqual([{ navigate: { route: "/sign-up" } }]);
    expect(find(doc.root, "landing-home-pricing-plan-1-price")?.props).toEqual({ value: "$20 / month" });
    expect(find(doc.root, "landing-home-pricing-plan-1-action")?.props).toMatchObject({ variant: "primary" });
    expect(find(doc.root, "landing-home-features-item-0-icon")).toMatchObject({ type: "Icon", props: { name: "bolt" } });
    expect(find(doc.root, "landing-home-features-item-1-icon")).toBeUndefined();
  });

  it("gives a signup section its own state and sends the email to the host command", () => {
    const doc = compileLandingPage(meta, { hostCapabilities: caps });
    expect(doc.state).toEqual({ newsEmail: "", newsStatus: "idle", newsError: "" });
    const [action] = (find(doc.root, "landing-home-news-submit")?.events?.onClick ?? []) as Array<{
      command: Record<string, unknown>;
    }>;
    expect(action?.command).toEqual({
      name: "newsletter.subscribe",
      payload: { email: { $expr: { path: "state.newsEmail" } }, source: "news" },
      statusPath: "newsStatus",
      errorPath: "newsError",
      onSuccess: { setState: { path: "newsEmail", value: "" } },
    });
    expect(find(doc.root, "landing-home-news-success")?.visibility).toEqual({
      condition: { "==": [{ path: "state.newsStatus" }, { literal: "success" }] },
    });
  });

  it("has no state at all when no section needs one", () => {
    const doc = compileLandingPage({ ...meta, sections: meta.sections.filter((s) => s.kind !== "signup") }, { hostCapabilities: caps });
    expect(doc).not.toHaveProperty("state");
  });

  it("refuses a signup command the host does not allowlist", () => {
    const sections = [{ kind: "signup" as const, id: "news", title: t("x"), command: "mail.add" }];
    expect(() => compileLandingPage({ ...meta, sections }, { hostCapabilities: caps })).toThrow(
      /meta\.sections\.0\.command: command "mail\.add" is not in hostCapabilities\.commands/,
    );
  });

  it("refuses an unknown kind, a duplicate id, and an id that is not an identifier", () => {
    const bad = (sections: unknown[]) => () => compileLandingPage({ ...meta, sections: sections as LandingPageMeta["sections"] }, { hostCapabilities: caps });
    expect(bad([{ kind: "carousel", id: "a" }])).toThrow(/unknown kind "carousel"/);
    expect(bad([{ kind: "cta", id: "a", title: t("x"), action: { label: t("x"), route: "/" } }, { kind: "cta", id: "a", title: t("y"), action: { label: t("y"), route: "/" } }])).toThrow(/"a" is used twice/);
    expect(bad([{ kind: "cta", id: "call-to-action", title: t("x"), action: { label: t("x"), route: "/" } }])).toThrow(/must be letters and digits/);
  });

  it("is deterministic, has unique node ids, and is a valid document", () => {
    const a = compileLandingPage(meta, { hostCapabilities: caps });
    expect(JSON.stringify(a)).toBe(JSON.stringify(compileLandingPage(meta, { hostCapabilities: caps })));
    expect(new Set(ids(a.root)).size).toBe(ids(a.root).length);
    expect(DocumentSchema.safeParse(a).success).toBe(true);
  });
});
