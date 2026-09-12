import { useEffect, useRef, useState } from "react";
import {
  IconCog,
  IconRefresh,
  IconPuzzle,
  IconBeaker,
  IconDownload,
  IconUpload,
  IconTable,
  IconClose,
  IconSearch,
} from "@uidl-runtime/templates/meridian/icons";

interface FloatingToolsMenuProps {
  onNavigate: (path: string) => void;
  onResetData?: () => void;
  onExportJson?: () => void;
  onExportCsv?: () => void;
  onImportFile?: (file: File) => void;
  onOpenSearch?: () => void;
  isDark?: boolean;
}

export function FloatingToolsMenu({
  onNavigate,
  onResetData,
  onExportJson,
  onExportCsv,
  onImportFile,
  onOpenSearch,
  isDark = false,
}: FloatingToolsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportFile) {
      onImportFile(file);
      setIsOpen(false);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  return (
    <div ref={menuRef} className={`fixed bottom-5 right-5 z-40 pointer-events-none ${isDark ? "dark" : ""}`}>
      {/* Hidden file input for JSON/CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Floating Menu Popover Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Developer & Tools Menu"
          className="pointer-events-auto absolute bottom-14 right-0 w-72 origin-bottom-right rounded-xl border border-gray-200 bg-white p-2 shadow-2xl transition-all duration-150 ease-out dark:border-gray-800 dark:bg-gray-850 dark:text-gray-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <IconCog className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Developer & Tools
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick Nav Section */}
          <div className="space-y-0.5 py-1.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate("/gallery");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <IconPuzzle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div>
                <div className="font-medium">Components Gallery</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Katalog UI library & layout</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate("/playground");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <IconBeaker className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div>
                <div className="font-medium">Schema Playground</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Live editor & AI synthesizer</div>
              </div>
            </button>

            {onOpenSearch && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSearch();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <IconSearch className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <div className="flex flex-1 items-center justify-between">
                  <div className="font-medium">Command Palette</div>
                  <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    ⌘K
                  </kbd>
                </div>
              </button>
            )}
          </div>

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          {/* Data & Storage Section */}
          <div className="space-y-0.5 py-1.5">
            {onExportJson && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportJson();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <IconDownload className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <div className="font-medium">Export Data (JSON)</div>
              </button>
            )}

            {onExportCsv && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportCsv();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <IconTable className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <div className="font-medium">Export Data (CSV)</div>
              </button>
            )}

            {onImportFile && (
              <button
                type="button"
                onClick={triggerImport}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <IconUpload className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <div className="font-medium">Import Data (JSON / CSV)</div>
              </button>
            )}

            {onResetData && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onResetData();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <IconRefresh className="h-4 w-4" />
                <div>
                  <div className="font-medium">Reset Reference Data</div>
                  <div className="text-xs text-red-400/80 dark:text-red-400/60">Kembalikan baseline awal</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sticky Fixed Circular Config Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Developer & Tools Menu"
        title="Developer & Tools Menu (Reset, Components, Playground, Export/Import)"
        className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-gray-50 hover:text-gray-900 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 dark:hover:text-white ${
          isOpen ? "ring-2 ring-gray-900 dark:ring-gray-300" : ""
        }`}
      >
        <IconCog className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
      </button>
    </div>
  );
}
