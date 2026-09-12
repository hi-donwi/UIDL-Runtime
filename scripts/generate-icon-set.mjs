/*
 * Generates `src/components/icons.tsx` from the installed Heroicons v2 *outline* modules.
 *
 * Why generate instead of importing @heroicons/react at runtime: the published package must
 * stay dependency-light (heroicons is a devDependency), and UIDL documents address icons by
 * name — a name -> path map has to exist inside the bundle anyway. Heroicons is MIT licensed;
 * the attribution is emitted into the generated file.
 *
 * Outline only, by design: the demo chrome uses one stroke weight everywhere, so there is no
 * solid variant to fall out of sync with.
 *
 *   node scripts/generate-icon-set.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outlineDir = join(root, "node_modules/@heroicons/react/24/outline");

/**
 * Semantic name -> Heroicons component name.
 *
 * Names are the public vocabulary: they appear in JSON documents (`props.iconName`) and in the
 * demo's label->icon resolver, so they are intentionally descriptive rather than a 1:1 copy of
 * Heroicons' naming.
 */
const ICONS = {
  // --- Chrome & navigation -------------------------------------------------
  home: "Home",
  menu: "Bars3",
  search: "MagnifyingGlass",
  close: "XMark",
  plus: "Plus",
  minus: "Minus",
  check: "Check",
  "chevron-left": "ChevronLeft",
  "chevron-right": "ChevronRight",
  "chevron-up": "ChevronUp",
  "chevron-down": "ChevronDown",
  "chevron-up-down": "ChevronUpDown",
  "chevrons-left": "ChevronDoubleLeft",
  "chevrons-right": "ChevronDoubleRight",
  "arrow-left": "ArrowLeft",
  "arrow-right": "ArrowRight",
  "arrow-up": "ArrowUp",
  "arrow-down": "ArrowDown",
  "arrow-long-up": "ArrowLongUp",
  "arrow-long-down": "ArrowLongDown",
  "arrow-turn-down-left": "ArrowTurnDownLeft",
  "arrow-uturn-left": "ArrowUturnLeft",
  "external-link": "ArrowTopRightOnSquare",
  refresh: "ArrowPath",
  ellipsis: "EllipsisHorizontal",
  filter: "Funnel",
  sort: "ArrowsUpDown",
  "arrows-right-left": "ArrowsRightLeft",
  "command-line": "CommandLine",

  // --- Actions -------------------------------------------------------------
  pencil: "PencilSquare",
  trash: "Trash",
  duplicate: "DocumentDuplicate",
  eye: "Eye",
  share: "Share",
  link: "Link",
  printer: "Printer",
  download: "ArrowDownTray",
  upload: "ArrowUpTray",
  clipboard: "Clipboard",
  "clipboard-copy": "ClipboardDocument",
  send: "PaperAirplane",
  bolt: "Bolt",
  sparkles: "Sparkles",
  play: "PlayCircle",
  pause: "PauseCircle",
  "light-bulb": "LightBulb",

  // --- Status & feedback ---------------------------------------------------
  "check-circle": "CheckCircle",
  "check-badge": "CheckBadge",
  "x-circle": "XCircle",
  "exclamation-triangle": "ExclamationTriangle",
  "exclamation-circle": "ExclamationCircle",
  "information-circle": "InformationCircle",
  "question-circle": "QuestionMarkCircle",
  "no-symbol": "NoSymbol",
  bell: "Bell",
  "bell-alert": "BellAlert",
  flag: "Flag",
  fire: "Fire",
  star: "Star",
  trophy: "Trophy",
  "thumb-up": "HandThumbUp",
  "face-smile": "FaceSmile",

  // --- Settings & meta -----------------------------------------------------
  cog: "Cog6Tooth",
  adjustments: "AdjustmentsHorizontal",
  wrench: "WrenchScrewdriver",
  swatch: "Swatch",
  "paint-brush": "PaintBrush",
  code: "CodeBracket",
  beaker: "Beaker",
  "puzzle-piece": "PuzzlePiece",
  language: "Language",
  sun: "Sun",
  moon: "Moon",
  globe: "GlobeAlt",
  window: "Window",
  "computer-desktop": "ComputerDesktop",
  "device-phone": "DevicePhoneMobile",

  // --- Layout & component vocabulary ---------------------------------------
  squares: "Squares2X2",
  "squares-plus": "SquaresPlus",
  "rectangle-group": "RectangleGroup",
  "rectangle-stack": "RectangleStack",
  "view-columns": "ViewColumns",
  "table-cells": "TableCells",
  "list-bullet": "ListBullet",
  "queue-list": "QueueList",
  "numbered-list": "NumberedList",
  "square-3-stack": "Square3Stack3D",
  "cursor-arrow": "CursorArrowRays",
  photo: "Photo",
  film: "Film",
  "qr-code": "QrCode",
  hashtag: "Hashtag",
  variable: "Variable",
  "chat-bubble": "ChatBubbleLeftRight",
  envelope: "Envelope",
  phone: "Phone",
  megaphone: "Megaphone",
  lifebuoy: "Lifebuoy",

  // --- Documents -----------------------------------------------------------
  document: "Document",
  "document-text": "DocumentText",
  "document-check": "DocumentCheck",
  "document-chart": "DocumentChartBar",
  "document-plus": "DocumentPlus",
  "document-search": "DocumentMagnifyingGlass",
  "clipboard-check": "ClipboardDocumentCheck",
  "clipboard-list": "ClipboardDocumentList",
  folder: "Folder",
  "folder-open": "FolderOpen",
  inbox: "InboxArrowDown",
  "inbox-stack": "InboxStack",
  archive: "ArchiveBox",
  newspaper: "Newspaper",
  "book-open": "BookOpen",
  bookmark: "Bookmark",
  calendar: "CalendarDays",
  "calendar-range": "CalendarDateRange",
  clock: "Clock",

  // --- Money & accounting --------------------------------------------------
  banknotes: "Banknotes",
  "credit-card": "CreditCard",
  wallet: "Wallet",
  "currency-dollar": "CurrencyDollar",
  "receipt-percent": "ReceiptPercent",
  "receipt-refund": "ReceiptRefund",
  calculator: "Calculator",
  scale: "Scale",
  "percent-badge": "PercentBadge",

  // --- Analytics -----------------------------------------------------------
  "chart-bar": "ChartBar",
  "chart-bar-square": "ChartBarSquare",
  "chart-pie": "ChartPie",
  "chart-line": "PresentationChartLine",
  "presentation-chart": "PresentationChartBar",
  "trending-up": "ArrowTrendingUp",
  "trending-down": "ArrowTrendingDown",

  // --- People & organisations ----------------------------------------------
  user: "User",
  "user-circle": "UserCircle",
  "user-plus": "UserPlus",
  users: "Users",
  "user-group": "UserGroup",
  identification: "Identification",
  "academic-cap": "AcademicCap",
  briefcase: "Briefcase",
  "building-library": "BuildingLibrary",
  "building-office": "BuildingOffice2",
  storefront: "BuildingStorefront",

  // --- Trade, stock & operations -------------------------------------------
  "shopping-cart": "ShoppingCart",
  "shopping-bag": "ShoppingBag",
  tag: "Tag",
  ticket: "Ticket",
  gift: "Gift",
  truck: "Truck",
  cube: "Cube",
  "cube-transparent": "CubeTransparent",
  "circle-stack": "CircleStack",
  server: "ServerStack",
  "cpu-chip": "CpuChip",
  "rocket-launch": "RocketLaunch",
  "map-pin": "MapPin",
  map: "Map",
  scissors: "Scissors",
  fingerprint: "FingerPrint",
  key: "Key",
  "lock-closed": "LockClosed",
  "lock-open": "LockOpen",
  "shield-check": "ShieldCheck",
  "shield-exclamation": "ShieldExclamation",
  heart: "Heart",
  "hand-raised": "HandRaised",
};

function extractPaths(heroName) {
  const source = readFileSync(join(outlineDir, `${heroName}Icon.js`), "utf8");
  const paths = [...source.matchAll(/createElement\("path",\s*\{([\s\S]*?)\}\)/g)]
    .map((match) => match[1].match(/d:\s*"((?:[^"\\]|\\.)*)"/)?.[1])
    .filter(Boolean);
  if (paths.length === 0) throw new Error(`No path data found for ${heroName}`);
  return paths;
}

const entries = Object.entries(ICONS)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, heroName]) => {
    const paths = extractPaths(heroName).map((d) => JSON.stringify(d));
    return `  "${name}": [\n${paths.map((d) => `    ${d},`).join("\n")}\n  ],`;
  });

const file = `/*
 * GENERATED FILE — do not edit by hand. Run \`node scripts/generate-icon-set.mjs\` instead.
 *
 * Outline icon paths transcribed from Heroicons v2 (https://heroicons.com), MIT licensed,
 * Copyright (c) Tailwind Labs, Inc. Only the 24x24 *outline* set is used: one stroke weight,
 * one visual language, no solid variants to keep in sync.
 *
 * The paths are inlined rather than imported so the published package carries no icon
 * dependency, and so a JSON document can name an icon (\`props.iconName: "printer"\`) without the
 * host application having to register anything.
 */

/** Every icon name a document or the demo chrome may reference. */
export const ICON_PATHS: Record<string, string[]> = {
${entries.join("\n")}
};

export type IconName = keyof typeof ICON_PATHS;

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

export function hasIcon(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(ICON_PATHS, name);
}
`;

writeFileSync(join(root, "src/components/iconPaths.ts"), file);
console.log(`Wrote src/components/iconPaths.ts (${Object.keys(ICONS).length} outline icons)`);
