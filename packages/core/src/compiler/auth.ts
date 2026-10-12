/**
 * Public authentication recipe — sign in, sign up, forgot password, reset password.
 *
 * The page collects what the mode needs and hands it to one host command. Checking a password,
 * issuing a session, and sending a reset email are the host's business: a UIDL document never
 * decides who someone is. So the command must be in `hostCapabilities.commands` (fail-closed),
 * exactly like every other name a recipe emits.
 *
 * Not one of the seven `PageRecipe` values: those are mirrored by the Java generator, and an
 * eighth recipe in one implementation only would be drift. It is exported beside them from
 * `uidl-runtime/recipes`.
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import type { FieldMeta, HostCapabilities, LocalizedText, UiPolicy } from "./types.js";

export type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

export const AUTH_MODES: readonly AuthMode[] = ["sign-in", "sign-up", "forgot-password", "reset-password"] as const;

export interface AuthLink {
  label: LocalizedText;
  route: string;
}

/** A third-party sign-in, such as an OpenID Connect provider; its command is the host's. */
export interface AuthProvider {
  id: string;
  label: LocalizedText;
  command: string;
}

export interface AuthPageMeta {
  name: string;
  mode: AuthMode;
  /** The host command that performs the request. Must be in `hostCapabilities.commands`. */
  command: string;
  /** Heading; defaults to the mode's own. */
  label?: LocalizedText;
  description?: LocalizedText;
  /** Fields beyond the mode's own, such as a display name on sign-up. */
  fields?: FieldMeta[];
  submitLabel?: LocalizedText;
  /** Where to go once the command succeeds. */
  successRoute?: string;
  links?: AuthLink[];
  providers?: AuthProvider[];
  brand?: { name?: LocalizedText; logo?: string };
  route?: string;
}

export interface CompileAuthOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  docId?: string;
}

const BORDER_COLOR = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

const text = (id: string, en: string): LocalizedText => ({ id, en });

const MODE_TEXT: Record<AuthMode, { heading: LocalizedText; submit: LocalizedText }> = {
  "sign-in": { heading: text("Masuk", "Sign in"), submit: text("Masuk", "Sign in") },
  "sign-up": { heading: text("Buat akun", "Create an account"), submit: text("Daftar", "Sign up") },
  "forgot-password": { heading: text("Lupa kata sandi", "Forgot password"), submit: text("Kirim tautan", "Send reset link") },
  "reset-password": { heading: text("Atur ulang kata sandi", "Reset password"), submit: text("Simpan kata sandi", "Save password") },
};

const EMAIL: FieldMeta = { key: "email", label: text("Email", "Email"), widget: "TextField", required: true };
const PASSWORD: FieldMeta = { key: "password", label: text("Kata sandi", "Password"), widget: "TextField", required: true };

/** The fields a mode always asks for, before any the meta adds. */
const MODE_FIELDS: Record<AuthMode, FieldMeta[]> = {
  "sign-in": [EMAIL, PASSWORD],
  "sign-up": [EMAIL, PASSWORD],
  "forgot-password": [EMAIL],
  "reset-password": [PASSWORD],
};

/** Field keys whose value is masked on screen. */
const SECRET_KEYS = new Set(["password"]);

/** Every command the meta names, with where it was named, for the capability gate. */
function namedCommands(meta: AuthPageMeta): Array<{ name: string; path: string }> {
  return [
    { name: meta.command, path: "meta.command" },
    ...(meta.providers ?? []).map((p) => ({ name: p.command, path: `meta.providers.${p.id}.command` })),
  ];
}

export function compileAuthPage(meta: AuthPageMeta, options: CompileAuthOptions): UIDLDocument {
  if (!AUTH_MODES.includes(meta.mode)) {
    throw new Error(`compileAuthPage: unknown mode "${String(meta.mode)}"; expected one of ${AUTH_MODES.join(", ")}`);
  }
  const allowed = new Set(options.hostCapabilities.commands);
  const refused = namedCommands(meta).filter((c) => !allowed.has(c.name));
  if (refused.length > 0) {
    throw new Error(
      `compileAuthPage: hostCapabilities rejected: ${refused
        .map((c) => `${c.path}: command "${c.name}" is not in hostCapabilities.commands`)
        .join("; ")}`,
    );
  }

  const lang: Language = options.uiPolicy?.lang ?? "id";
  const say = (value: LocalizedText | undefined, fallback: LocalizedText) => (value ?? fallback)[lang] ?? fallback.en;
  const docId = options.docId ?? `auth-${meta.name.toLowerCase()}`;
  const heading = say(meta.label, MODE_TEXT[meta.mode].heading);
  const fields = [...MODE_FIELDS[meta.mode], ...(meta.fields ?? [])];
  const prefix = `auth-${meta.name}`;

  const state: Record<string, unknown> = { formStatus: "idle", formError: "" };
  for (const field of fields) state[field.key] = field.default ?? (field.widget === "Checkbox" || field.widget === "Switch" ? false : "");

  const payload: Record<string, unknown> = {};
  for (const field of fields) payload[field.key] = { $expr: { path: `state.${field.key}` } };
  // A reset link carries its token; the page reads it, it never asks for it.
  if (meta.mode === "reset-password") payload.token = { $expr: { path: "route.token" } };

  // A password is cleared once the command has run, so it does not outlive the request in
  // document state whichever way it went.
  const clearSecrets = fields
    .filter((f) => SECRET_KEYS.has(f.key))
    .map((f) => ({ setState: { path: f.key, value: "" } }));
  const afterSuccess = [...clearSecrets, ...(meta.successRoute ? [{ navigate: { route: meta.successRoute } }] : [])];

  const submit: UIDLNode = {
    id: `${prefix}-submit`,
    type: "Button",
    props: { label: say(meta.submitLabel, MODE_TEXT[meta.mode].submit), variant: "primary" },
    style: { width: "w-full" },
    events: {
      onClick: [
        {
          command: {
            name: meta.command,
            payload,
            statusPath: "formStatus",
            errorPath: "formError",
            resultPath: "authResult",
            ...(afterSuccess.length > 0 ? { onSuccess: afterSuccess.length === 1 ? afterSuccess[0] : { sequence: afterSuccess } } : {}),
            ...(clearSecrets.length > 0 ? { onError: clearSecrets.length === 1 ? clearSecrets[0] : { sequence: clearSecrets } } : {}),
          },
        },
      ],
    },
  };

  const card: UIDLNode[] = [];
  if (meta.brand?.logo) {
    card.push({ id: `${prefix}-logo`, type: "Image", props: { src: meta.brand.logo, alt: meta.brand.name?.[lang] ?? "" }, style: { height: "h-10" } });
  }
  if (meta.brand?.name) {
    card.push({ id: `${prefix}-brand`, type: "Text", props: { value: meta.brand.name[lang] ?? meta.brand.name.en }, style: { color: TEXT_SECONDARY } });
  }
  card.push({ id: `${prefix}-heading`, type: "Text", props: { value: heading, heading: 1 }, style: { fontSize: "text-2xl", fontWeight: 600 } });
  if (meta.description) {
    card.push({ id: `${prefix}-description`, type: "Text", props: { value: meta.description[lang] ?? meta.description.en }, style: { color: TEXT_SECONDARY } });
  }
  card.push({
    id: `${prefix}-form`,
    type: "Form",
    style: { display: "flex", flexDirection: "column", gap: "gap-3" },
    children: fields.map((field) => fieldControl(prefix, field, lang)),
  });
  card.push({
    id: `${prefix}-error`,
    type: "Text",
    props: { value: { $bind: "state.formError" } },
    style: { color: "{primitives.color.error}" },
    // Shown on a failed request only: the interpreter clears `formError` to undefined when a
    // command starts, so a comparison with "" would show an empty error line while it runs.
    visibility: { condition: { "==": [{ path: "state.formStatus" }, { literal: "error" }] } },
  });
  card.push(submit);

  if (meta.providers && meta.providers.length > 0) {
    card.push({ id: `${prefix}-providers-divider`, type: "Divider" });
    for (const provider of meta.providers) {
      card.push({
        id: `${prefix}-provider-${provider.id}`,
        type: "Button",
        props: { label: provider.label[lang] ?? provider.label.en, variant: "secondary" },
        style: { width: "w-full" },
        events: {
          onClick: [
            {
              command: {
                name: provider.command,
                payload: { provider: provider.id },
                statusPath: "formStatus",
                errorPath: "formError",
                resultPath: "authResult",
                ...(meta.successRoute ? { onSuccess: { navigate: { route: meta.successRoute } } } : {}),
              },
            },
          ],
        },
      });
    }
  }

  if (meta.links && meta.links.length > 0) {
    card.push({
      id: `${prefix}-links`,
      type: "Row",
      style: { justifyContent: "space-between", gap: "gap-2" },
      children: meta.links.map((link, index) => ({
        id: `${prefix}-link-${index}`,
        type: "Button",
        props: { label: link.label[lang] ?? link.label.en, variant: "secondary" },
        events: { onClick: [{ navigate: { route: link.route } }] },
      })),
    });
  }

  return {
    version: "1.0.0",
    id: docId,
    name: heading,
    ...(meta.route ? { route: meta.route } : {}),
    state,
    root: {
      id: `${prefix}-page`,
      type: "Column",
      style: { minHeight: "min-h-screen", width: "w-full", alignItems: "center", justifyContent: "center", padding: "p-4" },
      children: [
        {
          id: `${prefix}-card`,
          type: "Column",
          style: {
            width: "w-full",
            maxWidth: "max-w-sm",
            padding: "p-6",
            gap: "gap-4",
            borderWidth: "border",
            borderColor: BORDER_COLOR,
            borderRadius: "rounded-lg",
          },
          children: card,
        },
      ],
    },
  };
}

function fieldControl(prefix: string, field: FieldMeta, lang: Language): UIDLNode {
  const label = `${field.label[lang] ?? field.label.en}${field.required ? " *" : ""}`;
  const placeholder = typeof field.placeholder === "string" ? field.placeholder : field.placeholder?.[lang];
  const props: Record<string, unknown> = {
    label,
    value: { $bind: `state.${field.key}` },
    ...(placeholder ? { placeholder } : {}),
    ...(SECRET_KEYS.has(field.key) ? { obscureText: true } : {}),
  };
  const type = field.widget === "Textarea" || field.widget === "Checkbox" || field.widget === "Switch" ? field.widget : "TextField";
  if (type === "Checkbox" || type === "Switch") {
    delete props.value;
    props.checked = { $bind: `state.${field.key}` };
  }
  return {
    id: `${prefix}-field-${field.key}`,
    type,
    props,
    events: { onChange: [{ setState: { path: field.key, value: null } }] },
  };
}
