import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { PageBar } from "../../packages/core/src/components/primitives";
import { createAdminForm, createAdminHeader, createAdminSection } from "../../packages/core/src/compiler";
import { renderUIDocument } from "../../packages/core/src/renderer/renderDocument";
import { meridianLightTheme, meridianDarkTheme } from "../../packages/core/src/theme/meridianPreset";
import type { Theme, UIDLDocument } from "../../packages/core/src/types";

const pagination = renderToStaticMarkup(createElement("div", { className: "meridian-ui" },
  createElement(PageBar, { total: 120, page: 2, pageSize: 20 })));
function admin(theme: Theme): string {
  const document: UIDLDocument = {
    version: "1.0", id: "settings", name: "Settings",
    root: { id: "page", type: "Container", children: [
      createAdminHeader({ id: "header", title: "Workspace configuration and administration",
        description: "Update the configuration for your monitoring workspace.",
        actions: [{ id: "activate", type: "Button", props: { label: "Activate workspace" } }] }),
      createAdminForm({ id: "form", children: [
        createAdminSection({ id: "identity", title: "Identity", description: "Basic workspace details.", children: [
          { id: "name", type: "TextField", props: { label: "Name", readOnly: true, value: "Example workspace" } },
          { id: "email", type: "TextField", props: { label: "Owner email", readOnly: true, value: "owner@example.test" } },
        ] }),
        createAdminSection({ id: "settings", title: "Settings", description: "Choose how this workspace operates.", children: [
          { id: "timezone", type: "TextField", props: { label: "Timezone", readOnly: true, value: "UTC" } },
        ] }),
      ], actions: [
        { id: "save", type: "Button", props: { label: "Save configuration", variant: "primary" } },
        { id: "reload", type: "Button", props: { label: "Reload configuration", variant: "secondary" } },
      ] }),
    ] },
  };
  return renderToStaticMarkup(createElement("main", { className: theme.mode === "dark" ? "meridian-ui dark" : "meridian-ui",
    style: { padding: "16px", background: theme.primitives.color.background, minHeight: "100vh" } },
    renderUIDocument(document, { theme })));
}
const projectedPath = process.env.UIDL_LAYOUT_DOCUMENT;
const projectedDocument = projectedPath ? JSON.parse(readFileSync(projectedPath, "utf8")) as UIDLDocument : undefined;
// Static geometry only: asynchronous query/adapter behavior has separate integration coverage.
if (projectedDocument) delete projectedDocument.dataSources;
const projected = projectedPath ? renderToStaticMarkup(createElement("main", { className: "meridian-ui", style: { padding: "16px" } },
  renderUIDocument(projectedDocument!, { theme: meridianLightTheme }))) : undefined;
process.stdout.write(JSON.stringify({ pagination, light: admin(meridianLightTheme), dark: admin(meridianDarkTheme), projected }));
