/*
 * Label -> icon resolution for the demo chrome.
 *
 * Icons come from the package's own outline set (src/components/icons.tsx, generated from
 * Heroicons v2 outline). Outline only, one stroke weight: an active sidebar row is marked by
 * Meridian's 4px inset bar and a darker label, never by a filled icon.
 *
 * Menus in this demo are authored in Indonesian and English side by side, so the resolver
 * matches on both vocabularies ("Pembiayaan"/"Financing", "Gudang"/"Warehouse").
 */
import { Icon } from "~/components/icons";
import { resolveIconName } from "./iconRules";

export { Icon };

export function GroupIcon({ label, className }: { label: string; className?: string }) {
  return <Icon name={resolveIconName(label, true)} className={className ?? "h-4 w-4 flex-shrink-0"} />;
}

export function ItemIcon({ label, className }: { label: string; className?: string }) {
  return <Icon name={resolveIconName(label, false)} className={className ?? "h-4 w-4 flex-shrink-0"} />;
}

/** Chrome icons referenced by name so call sites read as intent, not as glyph names. */
export function IconSearch(props: ChromeIconProps) { return <ChromeIcon name="search" {...props} />; }
export function IconClose(props: ChromeIconProps) { return <ChromeIcon name="close" {...props} />; }
export function IconPlus(props: ChromeIconProps) { return <ChromeIcon name="plus" {...props} />; }
export function IconHome(props: ChromeIconProps) { return <ChromeIcon name="home" {...props} />; }
export function IconMenu(props: ChromeIconProps) { return <ChromeIcon name="menu" {...props} />; }
export function IconChevronLeft(props: ChromeIconProps) { return <ChromeIcon name="chevron-left" {...props} />; }
export function IconChevronRight(props: ChromeIconProps) { return <ChromeIcon name="chevron-right" {...props} />; }
export function IconChevronsLeft(props: ChromeIconProps) { return <ChromeIcon name="chevrons-left" {...props} />; }
export function IconChevronsRight(props: ChromeIconProps) { return <ChromeIcon name="chevrons-right" {...props} />; }
export function IconSun(props: ChromeIconProps) { return <ChromeIcon name="sun" {...props} />; }
export function IconMoon(props: ChromeIconProps) { return <ChromeIcon name="moon" {...props} />; }
export function IconLanguage(props: ChromeIconProps) { return <ChromeIcon name="language" {...props} />; }
export function IconEnter(props: ChromeIconProps) { return <ChromeIcon name="arrow-turn-down-left" {...props} />; }
export function IconArrowUpDown(props: ChromeIconProps) { return <ChromeIcon name="sort" {...props} />; }
export function IconPrinter(props: ChromeIconProps) { return <ChromeIcon name="printer" {...props} />; }
export function IconSparkles(props: ChromeIconProps) { return <ChromeIcon name="sparkles" {...props} />; }
export function IconBolt(props: ChromeIconProps) { return <ChromeIcon name="bolt" {...props} />; }
export function IconWrench(props: ChromeIconProps) { return <ChromeIcon name="wrench" {...props} />; }
export function IconBeaker(props: ChromeIconProps) { return <ChromeIcon name="beaker" {...props} />; }
export function IconCheckCircle(props: ChromeIconProps) { return <ChromeIcon name="check-circle" {...props} />; }
export function IconXCircle(props: ChromeIconProps) { return <ChromeIcon name="x-circle" {...props} />; }
export function IconClipboardCopy(props: ChromeIconProps) { return <ChromeIcon name="clipboard-copy" {...props} />; }
export function IconDownload(props: ChromeIconProps) { return <ChromeIcon name="download" {...props} />; }
export function IconUpload(props: ChromeIconProps) { return <ChromeIcon name="upload" {...props} />; }
export function IconCode(props: ChromeIconProps) { return <ChromeIcon name="code" {...props} />; }
export function IconPuzzle(props: ChromeIconProps) { return <ChromeIcon name="puzzle-piece" {...props} />; }
export function IconWindow(props: ChromeIconProps) { return <ChromeIcon name="window" {...props} />; }
export function IconArrowLeft(props: ChromeIconProps) { return <ChromeIcon name="arrow-left" {...props} />; }
export function IconExclamation(props: ChromeIconProps) { return <ChromeIcon name="exclamation-triangle" {...props} />; }
export function IconRefresh(props: ChromeIconProps) { return <ChromeIcon name="refresh" {...props} />; }
export function IconCog(props: ChromeIconProps) { return <ChromeIcon name="cog" {...props} />; }
export function IconAdjustments(props: ChromeIconProps) { return <ChromeIcon name="adjustments-horizontal" {...props} />; }
export function IconTable(props: ChromeIconProps) { return <ChromeIcon name="table-cells" {...props} />; }

interface ChromeIconProps {
  className?: string;
}

function ChromeIcon({ name, className }: ChromeIconProps & { name: string }) {
  return <Icon name={name} className={className ?? "h-4 w-4"} />;
}
