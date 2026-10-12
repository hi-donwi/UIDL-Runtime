# ADR-0010: Presentation presets are recipes, and auth, shell, and landing sit beside the seven

* **Status:** Accepted (2026-10-12)
* **Deciders:** Project maintainers
* **Project:** uidl-runtime

## Context

Applications keep rebuilding the same screens: a sign-in page, a sign-up page, a password
reset, and an app shell with a sidebar that shows only what the user may open. A placement
decision taken in Kerangka (its ADR-0043) splits such presets by owner. Logic (who a user
is, which roles exist, what an approval does) lives in Kerangka packages. Presentation lives
here, because UIDL users who never touch Kerangka need the same screens. UIDL-Builder
consumes both and keeps no copies of its own.

Three things stood in the way here:

1. **Recipes were only reachable through the React entry.** A compiler that builds pages
   had to install React to call a pure function. That is now `uidl-runtime/recipes`.
2. **There was no auth or shell recipe.** The closest was
   `packages/templates/src/catalog/patterns/rbac-navigation.json`, a private example
   document rather than something a host can call.
3. **A password field could not be masked from a document on the web.** Flutter's
   `TextField` already read `obscureText`; the React `TextField` always rendered
   `type="text"` and passed the prop on to the DOM as an unknown attribute.

## Decision

- **`compileAuthPage(meta, options)`** builds sign-in, sign-up, forgot-password, and
  reset-password pages. The page collects what the mode needs and sends it to one host
  command. Checking credentials, issuing a session, and sending mail are the host's job:
  the command, and each provider's command, must be in `hostCapabilities.commands`, and
  the recipe refuses to compile otherwise. A reset page reads its token from `route.token`
  rather than asking for it. The password is cleared from document state after the
  command, whether it succeeded or failed.
- **`wrapInShell(page, meta, options)`** puts a page that any recipe produced inside a
  sidebar and top bar, keeping the page's id, route, state, and data sources. An item with
  a `permission` is shown only when `session.permissions.<permission>` is truthy. That is
  cosmetic gating, as everywhere in UIDL; the host still refuses the request. Sign-out is a
  host command and is allowlisted the same way.
- **`compileLandingPage(meta, options)`** assembles a marketing page from an ordered list of
  sections: `hero`, `features`, `pricing`, `testimonials`, `faq`, `cta`, and `signup`. Only
  `signup` talks to the host, sending an email to one allowlisted command; the rest is text
  and navigation. Section ids become node ids and state keys, so they must be identifiers.
- **None of them is an eighth `PageRecipe`.** The seven recipes are mirrored by the Java
  generator (`server/uidl-generator`), and a recipe added to one implementation only would
  be drift that nothing reports. All three are exported beside the seven, from the main
  entry and from `uidl-runtime/recipes`. They join `PageRecipe` when the Java side gets
  them too.
- **`obscureText` is a declared `TextField` prop.** The React renderer sets
  `type="password"` for it, so web and Flutter agree. Android has no default widgets yet
  and is unaffected.

## Consequences

### Positive

- A host gets working auth screens, a permission-aware shell, and a marketing site from
  metadata alone, and
  Kerangka's projector can call the same functions without React.
- Every name these recipes emit is checked against the host's allowlist before a document
  exists, which is the same fail-closed rule the seven recipes follow.

### Negative

- `uidl-compile` and the remote compiler cannot produce auth pages, a shell, or a landing page
  yet, because they dispatch on `PageRecipe`.

### Neutral

- Client-side validation is not added. The `validate` action only emits an event, so a
  required field is enforced by the host command and reported through `formError`.

## Alternatives Considered

| Option | Why rejected |
|---|---|
| Add `auth` to `PageRecipe` now | The Java generator mirrors the seven; a TS-only eighth recipe is silent drift |
| Ship the shell as a `definitions` + `slots` document, as in `rbac-navigation.json` | A document has to be copied and edited per app; a function composes with any recipe's output and is tested once |
| Keep auth templates in UIDL-Builder | Builder is an application; nothing outside it can call its templates, and its copies already drift from this repository's |
| Mask passwords with a new `PasswordField` widget | Flutter already reads `obscureText` on `TextField`; a second widget would split one control in two |
