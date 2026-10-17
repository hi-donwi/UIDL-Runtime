# Administration layout compositions

The administration compositions are opt-in helpers exported by the root package
and by the React-free uidl-runtime/recipes entry. They build ordinary UIDL nodes;
they do not register new widget types or change generic Row/Column/Form defaults.
They are available from 0.1.9; check package exports before use.

    import { createAdminHeader, createAdminForm, createAdminSection } from "uidl-runtime/recipes";

    const header = createAdminHeader({
      id: "settings-header",
      title: "Settings",
      description: "Manage workspace preferences."
    });
    const form = createAdminForm({
      id: "settings-form",
      children: [createAdminSection({
        id: "identity",
        title: "Identity",
        children: [{ id: "name", type: "TextField", props: { label: "Name" } }]
      })],
      actions: [
        { id: "save", type: "Button", props: { label: "Save", variant: "primary", type: "submit" } },
        { id: "return", type: "Button", props: { label: "Return", type: "button" } }
      ],
      events: { onSubmit: [{ command: { name: "SaveSettings" } }] }
    });

Place header and form under the document root and import uidl-runtime/style.css
in the React host. Give every supplied node a unique id. The host still owns state,
permission checks, command handling, submit/loading/error behavior, and navigation.
The helpers preserve the supplied nodes/events; they never invent backend wiring.

## Stable CSS hooks

The uidl-admin-header, uidl-admin-title, uidl-admin-description, uidl-admin-form,
uidl-admin-section, uidl-admin-section-title, and uidl-admin-actions hooks can also
be emitted by a generator using existing widgets. The runtime stylesheet owns their
implementation. Structural fallback utilities help consumers with older stylesheets.

Forms use a 42rem maximum width, 16px field gaps (`--uidl-field-gap: 1rem`), 24px section
spacing (`--uidl-section-gap: 1.5rem`), and a 16px wrapping action gap (`--uidl-action-gap: 1rem`)
at the default root size. Add uidl-admin-form-wide for a line-table form that needs its
container's width. Scoped CSS properties `--uidl-radius-control` (0.375rem / 6px) and
`--uidl-radius-card` (0.75rem / 12px) guarantee uniform corner curvature across form controls
and cards. Override scoped CSS properties --uidl-form-max-width, --uidl-field-gap,
--uidl-section-gap, --uidl-action-gap, and --uidl-radius-* when a surface needs another density.
Foreground and font values come from the renderer's theme variables. Supporting copy
defaults to readable primary ink; override --uidl-admin-description-color only with a validated
foreground/background pair. Validate contrast in the actual brand; a theme switch
must update the renderer and host mode together.

Enterprise applications built with UIDL must strictly adhere to the professional enterprise
visual standards: minimum 16px element spacing to ensure finger/mouse ergonomics, uniform
corner radius tokens, consistent card elevation shadows, and a zero-emoji policy (use semantic
SVG icons and badge components instead of playful emojis).

PageBar/DataTable pagination uses separate uidl-pagination-* hooks. Pointer targets
are 40px squares at the default root size; glyphs remain 16px. Page-size buttons
wrap, disabled directions remain visible, and zero results display 0 - 0.
Theme tokens and component hooks are safer than styling every button in a host.
Target dimensions are inline so broad action-button min-height rules do not
produce a narrow, tall pager.

Run npm run test:layout for synthetic Chrome geometry, wrapping, focus, theme
contrast, and doubled-text reflow checks. This is a shared composition regression;
each host still needs its real page and journey review. Inspect screenshots before
accepting visual baselines.
