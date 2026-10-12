import { describe, expect, it } from "vitest";
import { DocumentSchema } from "../../schemas/document";
import type { UIDLDocument, UIDLNode } from "../../types";
import { compileAuthPage, compileListPage, wrapInShell, type AuthPageMeta, type ShellMeta } from "../index.js";

const caps = { collections: ["invoices"], commands: ["auth.signIn", "auth.signUp", "auth.reset", "auth.forgot", "auth.oidc", "auth.signOut"] };

const signIn: AuthPageMeta = {
  name: "sign-in",
  mode: "sign-in",
  command: "auth.signIn",
  successRoute: "/",
  links: [{ label: { id: "Lupa kata sandi?", en: "Forgot password?" }, route: "/forgot-password" }],
};

function find(node: UIDLNode, id: string): UIDLNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const hit = find(child, id);
    if (hit) return hit;
  }
  return undefined;
}

type CommandAction = {
  command: { name: string; payload: Record<string, unknown>; onSuccess?: unknown; onError?: unknown };
};

/** The command the first click action of a node runs. */
function commandOf(node: UIDLNode | undefined): CommandAction["command"] {
  const [action] = (node?.events?.onClick ?? []) as CommandAction[];
  if (!action?.command) throw new Error(`${node?.id ?? "node"} runs no command on click`);
  return action.command;
}

function ids(node: UIDLNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(ids)];
}

describe("compileAuthPage", () => {
  it("asks sign-in for an email and a masked password, and sends both to the host command", () => {
    const doc = compileAuthPage(signIn, { hostCapabilities: caps, uiPolicy: { lang: "en" } });

    expect(doc.name).toBe("Sign in");
    expect(doc.state).toEqual({ formStatus: "idle", formError: "", email: "", password: "" });
    expect(find(doc.root, "auth-sign-in-field-email")?.props).toMatchObject({ value: { $bind: "state.email" } });
    expect(find(doc.root, "auth-sign-in-field-email")?.props).not.toHaveProperty("obscureText");
    expect(find(doc.root, "auth-sign-in-field-password")?.props).toMatchObject({ obscureText: true });

    const command = commandOf(find(doc.root, "auth-sign-in-submit"));
    expect(command.name).toBe("auth.signIn");
    expect(command.payload).toEqual({
      email: { $expr: { path: "state.email" } },
      password: { $expr: { path: "state.password" } },
    });
    // The password is cleared whichever way the request went; success also navigates.
    expect(command.onSuccess).toEqual({
      sequence: [{ setState: { path: "password", value: "" } }, { navigate: { route: "/" } }],
    });
    expect(command.onError).toEqual({ setState: { path: "password", value: "" } });
  });

  it("reads the reset token from the route and asks only for the new password", () => {
    const doc = compileAuthPage({ name: "reset", mode: "reset-password", command: "auth.reset" }, { hostCapabilities: caps });
    const command = commandOf(find(doc.root, "auth-reset-submit"));
    expect(Object.keys(doc.state!)).toEqual(["formStatus", "formError", "password"]);
    expect(command.payload.token).toEqual({ $expr: { path: "route.token" } });
    expect(doc.name).toBe("Atur ulang kata sandi");
  });

  it("asks forgot-password for an email only, and has nothing secret to clear", () => {
    const doc = compileAuthPage({ name: "forgot", mode: "forgot-password", command: "auth.forgot" }, { hostCapabilities: caps });
    const command = commandOf(find(doc.root, "auth-forgot-submit"));
    expect(Object.keys(command.payload)).toEqual(["email"]);
    expect(command).not.toHaveProperty("onError");
    expect(command).not.toHaveProperty("onSuccess");
  });

  it("adds the meta's own fields after the mode's on sign-up", () => {
    const doc = compileAuthPage(
      {
        name: "sign-up",
        mode: "sign-up",
        command: "auth.signUp",
        fields: [
          { key: "displayName", label: { id: "Nama", en: "Name" }, widget: "TextField", required: true },
          { key: "terms", label: { id: "Setuju", en: "I agree" }, widget: "Checkbox" },
        ],
      },
      { hostCapabilities: caps },
    );
    expect(Object.keys(doc.state!)).toEqual(["formStatus", "formError", "email", "password", "displayName", "terms"]);
    expect(doc.state!.terms).toBe(false);
    expect(find(doc.root, "auth-sign-up-field-terms")).toMatchObject({ type: "Checkbox", props: { checked: { $bind: "state.terms" } } });
  });

  it("renders each provider as a button running its own command", () => {
    const doc = compileAuthPage(
      { ...signIn, providers: [{ id: "google", label: { id: "Masuk dengan Google", en: "Continue with Google" }, command: "auth.oidc" }] },
      { hostCapabilities: caps },
    );
    const command = commandOf(find(doc.root, "auth-sign-in-provider-google"));
    expect(command).toMatchObject({ name: "auth.oidc", payload: { provider: "google" } });
  });

  it("refuses a command, or a provider's command, the host does not allowlist", () => {
    expect(() => compileAuthPage({ ...signIn, command: "auth.login" }, { hostCapabilities: caps })).toThrow(
      /meta\.command: command "auth\.login" is not in hostCapabilities\.commands/,
    );
    expect(() =>
      compileAuthPage(
        { ...signIn, providers: [{ id: "x", label: { id: "X", en: "X" }, command: "auth.x" }] },
        { hostCapabilities: caps },
      ),
    ).toThrow(/meta\.providers\.x\.command/);
  });

  it("refuses an unknown mode", () => {
    expect(() => compileAuthPage({ ...signIn, mode: "magic" as never }, { hostCapabilities: caps })).toThrow(/unknown mode "magic"/);
  });

  it("shows the error line only when the request failed", () => {
    const doc = compileAuthPage(signIn, { hostCapabilities: caps });
    expect(find(doc.root, "auth-sign-in-error")?.visibility).toEqual({
      condition: { "==": [{ path: "state.formStatus" }, { literal: "error" }] },
    });
  });

  it("is deterministic and a valid document", () => {
    const a = compileAuthPage(signIn, { hostCapabilities: caps });
    const b = compileAuthPage(signIn, { hostCapabilities: caps });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(DocumentSchema.safeParse(a).success).toBe(true);
    expect(new Set(ids(a.root)).size).toBe(ids(a.root).length);
  });
});

describe("wrapInShell", () => {
  const page: UIDLDocument = compileListPage(
    {
      name: "invoices",
      label: { id: "Faktur", en: "Invoices" },
      titleField: "number",
      fields: [{ key: "number", label: { id: "Nomor", en: "Number" }, widget: "TextField" }],
      columns: [{ field: "number" }],
      defaultSort: { field: "number", dir: "asc" },
    },
    { hostCapabilities: caps },
  );

  const shell: ShellMeta = {
    name: "app",
    title: { id: "Konsol", en: "Console" },
    items: [
      { id: "home", label: { id: "Beranda", en: "Home" }, route: "/" },
      { id: "invoices", label: { id: "Faktur", en: "Invoices" }, route: "/invoices", icon: "document", permission: "invoices.read" },
    ],
    signOutCommand: "auth.signOut",
    signOutRoute: "/sign-in",
  };

  it("keeps the page's identity, state, and data, and puts its root in the main area", () => {
    const wrapped = wrapInShell(page, shell, { hostCapabilities: caps });
    expect(wrapped.id).toBe(page.id);
    expect(wrapped.route).toBe(page.route);
    expect(wrapped.state).toEqual(page.state);
    expect(wrapped.dataSources).toEqual(page.dataSources);
    expect(find(wrapped.root, "shell-app-main")?.children?.[1]).toEqual(page.root);
  });

  it("gates an item by its permission and marks the current route", () => {
    const wrapped = wrapInShell(page, shell, { hostCapabilities: caps, currentRoute: "/invoices" });
    const home = find(wrapped.root, "shell-app-nav-home")!;
    const invoices = find(wrapped.root, "shell-app-nav-invoices")!;
    expect(home.visibility).toBeUndefined();
    expect(invoices.visibility).toEqual({ condition: { path: "session.permissions.invoices.read" } });
    expect(invoices.props).toMatchObject({ variant: "primary", iconName: "document", "aria-current": "page" });
    expect(home.props).toMatchObject({ variant: "secondary" });
    expect(invoices.events?.onClick).toEqual([{ navigate: { route: "/invoices" } }]);
  });

  it("marks no item when the page's route is unknown", () => {
    const wrapped = wrapInShell(page, shell, { hostCapabilities: caps });
    expect(find(wrapped.root, "shell-app-nav-invoices")?.props).toMatchObject({ variant: "secondary" });
    expect(find(wrapped.root, "shell-app-nav-invoices")?.props).not.toHaveProperty("aria-current");
  });

  it("signs out through the host command and goes where the meta says", () => {
    const wrapped = wrapInShell(page, shell, { hostCapabilities: caps });
    expect(find(wrapped.root, "shell-app-sign-out")?.events?.onClick).toEqual([
      { command: { name: "auth.signOut", onSuccess: { navigate: { route: "/sign-in" } } } },
    ]);
  });

  it("refuses a sign-out command the host does not allowlist, and duplicate item ids", () => {
    expect(() => wrapInShell(page, { ...shell, signOutCommand: "auth.logout" }, { hostCapabilities: caps })).toThrow(/auth\.logout/);
    expect(() =>
      wrapInShell(page, { ...shell, items: [...shell.items, { ...shell.items[0]! }] }, { hostCapabilities: caps }),
    ).toThrow(/"home" is used twice/);
  });

  it("refuses a page whose node ids collide with the shell's", () => {
    const clashing: UIDLDocument = { ...page, root: { id: "shell-app-main", type: "Column" } };
    expect(() => wrapInShell(clashing, shell, { hostCapabilities: caps })).toThrow(/"shell-app-main"/);
  });

  it("wraps an auth page or a list page into a valid, deterministic document", () => {
    for (const inner of [page, compileAuthPage(signIn, { hostCapabilities: caps })]) {
      const a = wrapInShell(inner, shell, { hostCapabilities: caps });
      expect(JSON.stringify(a)).toBe(JSON.stringify(wrapInShell(inner, shell, { hostCapabilities: caps })));
      expect(DocumentSchema.safeParse(a).success).toBe(true);
      expect(new Set(ids(a.root)).size).toBe(ids(a.root).length);
    }
  });
});
