import { useMemo } from "react";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { DocumentSchema } from "~/schemas/document";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import { createDocumentState } from "~/state/createDocumentState";
import { MeridianShell, type ShellNavGroup } from "../MeridianShell";
import { GALLERY_SECTIONS, buildGalleryDocument, parseGalleryCategory } from "./galleryDocuments";

const GALLERY_GROUPS: ShellNavGroup[] = [
  {
    label: "Components",
    items: GALLERY_SECTIONS.map((section) => ({ label: section.label, path: `/gallery/${section.id}` })),
  },
];

/**
 * The component gallery, shown in the same shell as every other demo so the widgets are seen
 * in the chrome they were designed against — Meridian's sidebar, page header and page background —
 * rather than on a blank page.
 */
export function GalleryRoute({
  path,
  onNavigate,
  onBack,
  isDark,
  onToggleTheme,
}: {
  path: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}) {
  const category = useMemo(() => parseGalleryCategory(path), [path]);
  const document = useMemo(() => DocumentSchema.parse(buildGalleryDocument(category)), [category]);
  // Overlay specimens bind `open` to state.overlays.*, so the document needs a real store.
  const stateStore = useMemo(() => createDocumentState(document.state ?? {}).getState(), [document]);

  return (
    <MeridianShell
      company="Component Gallery"
      title={document.name}
      groups={GALLERY_GROUPS}
      activePath={`/gallery/${category}`}
      onNavigate={onNavigate}
      onBack={onBack}
      isDark={isDark}
      onToggleTheme={onToggleTheme}
    >
      <UIDocumentRenderer
        key={category}
        document={document}
        theme={isDark ? meridianDarkTheme : meridianLightTheme}
        dataSources={document.dataSources}
        stateStore={stateStore}
        onRouteChange={(nextRoute) => onNavigate(String(nextRoute))}
      />
    </MeridianShell>
  );
}
