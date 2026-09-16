import { useMemo, useRef, useState } from "react";
import { DocumentSchema } from "~/schemas/document";
import { meridianDarkTheme, meridianLightTheme } from "~/theme/meridianPreset";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import type { UIDLDocument, UIDLNode } from "~/types";
import { VisualInspectorPanel } from "./VisualInspectorPanel";
import { executeAiPipeline, type AiPipelineIssue } from "~/services/aiPipeline";
import { Icon } from "~/components/icons";

const PLAYGROUND_PRESETS: Record<string, { label: string; document: UIDLDocument }> = {
  healthcare: {
    label: "Healthcare EMR & Antrean Poli",
    document: {
      version: "1.0.0",
      id: "demo-healthcare-queue",
      name: "RS Medika Nusantara - Queue Manager",
      dataSources: {
        patients: [
          { noAntrean: "A-012", norm: "RM-2027-0412", nama: "Budi Santoso", poli: "Penyakit Dalam", dokter: "dr. Hendra, Sp.PD", jaminan: "BPJS Kesehatan", status: "Sedang Diperiksa" },
          { noAntrean: "A-013", norm: "RM-2027-0891", nama: "Siti Rahmawati", poli: "Penyakit Dalam", dokter: "dr. Hendra, Sp.PD", jaminan: "Asuransi Mandiri", status: "Menunggu Antrean" },
          { noAntrean: "B-005", norm: "RM-2027-1102", nama: "Ananda Kevin", poli: "Poli Anak", dokter: "dr. Ratna, Sp.A", jaminan: "Umum / Mandiri", status: "Menunggu Resep" },
        ],
        kpis: [
          { label: "Pasien Hari Ini", value: "401 Pasien" },
          { label: "Bed Occupancy", value: "82.4%" },
          { label: "Resep Terlayani", value: "318 R/" },
        ],
      },
      root: {
        id: "root-col",
        type: "Column",
        style: { gap: "gap-4", padding: "p-6" },
        children: [
          {
            id: "header-card",
            type: "Column",
            style: { padding: "p-4", borderWidth: "border", borderColor: "{primitives.color.border}", borderRadius: "{primitives.radius.md}" },
            children: [
              { id: "head-title", type: "Text", props: { value: "Antrean Poliklinik & Rekam Medis (EMR)", variant: "heading" }, style: { fontSize: "text-xl", fontWeight: "font-bold" } },
              { id: "head-sub", type: "Text", props: { value: "Live view antrean dokter spesialis dan verifikasi jaminan BPJS", variant: "paragraph" }, style: { fontSize: "text-xs", color: "{primitives.color.textSecondary}" } },
            ],
          },
          {
            id: "patient-table",
            type: "DataTable",
            style: { width: "w-full" },
            props: {
              title: "Daftar Pasien Aktif",
              dataSource: "patients",
              columns: [
                { key: "noAntrean", label: "No. Antrean" },
                { key: "norm", label: "No. RM" },
                { key: "nama", label: "Nama Pasien" },
                { key: "poli", label: "Poliklinik" },
                { key: "dokter", label: "Dokter" },
                { key: "status", label: "Status" },
              ],
              rowActions: [{ label: "Detail" }],
            },
          },
        ],
      },
    },
  },
  medtech: {
    label: "Medtech Device History Record (ISO 13485)",
    document: {
      version: "1.0.0",
      id: "demo-medtech-dhr",
      name: "PT Medtech Precision Indonesia - DHR Batch",
      dataSources: {
        batches: [
          { noDhr: "DHR-2027-B091", produk: "Disposable Syringe 5ml", lotNo: "LOT-2027-08A", cleanroom: "ISO Class 7", sterilisasi: "Gas EtO 100%", status: "Sterilization QC Passed" },
          { noDhr: "DHR-2027-B092", produk: "IV Catheter Radiopaque 22G", lotNo: "LOT-2027-08B", cleanroom: "ISO Class 7", sterilisasi: "Gas EtO 100%", status: "Bioburden Testing" },
        ],
      },
      root: {
        id: "root-medtech",
        type: "Column",
        style: { gap: "gap-4", padding: "p-6" },
        children: [
          {
            id: "dhr-table",
            type: "DataTable",
            style: { width: "w-full" },
            props: {
              title: "Device History Record (DHR) & Sterilisasi Lot",
              dataSource: "batches",
              columns: [
                { key: "noDhr", label: "No. DHR" },
                { key: "produk", label: "Produk Alkes" },
                { key: "lotNo", label: "Lot No" },
                { key: "cleanroom", label: "Cleanroom" },
                { key: "sterilisasi", label: "Sterilisasi" },
                { key: "status", label: "Status Mutu" },
              ],
              rowActions: [{ label: "CoA" }],
            },
          },
        ],
      },
    },
  },
  manufacturing: {
    label: "Manufacturing BOM & Work Orders",
    document: {
      version: "1.0.0",
      id: "demo-manufacturing-wo",
      name: "Pabrik ABC - Work Orders",
      dataSources: {
        workOrders: [
          { wo: "WO-2026-044", item: "Gear Housing A", status: "In Process", wip: "Rp 186.400.000", qty: "420 / 600" },
          { wo: "WO-2026-045", item: "Pump Bracket B", status: "QC Hold", wip: "Rp 74.800.000", qty: "180 / 300" },
          { wo: "WO-2026-046", item: "Valve Cover C", status: "Material Short", wip: "Rp 42.100.000", qty: "0 / 500" },
        ],
      },
      root: {
        id: "root-mfg",
        type: "Column",
        style: { gap: "gap-4", padding: "p-6" },
        children: [
          {
            id: "wo-table",
            type: "DataTable",
            style: { width: "w-full" },
            props: {
              title: "Perintah Kerja Produksi (Work Orders)",
              dataSource: "workOrders",
              columns: [
                { key: "wo", label: "No. WO" },
                { key: "item", label: "Komponen" },
                { key: "status", label: "Status" },
                { key: "wip", label: "Nilai WIP", align: "right" },
                { key: "qty", label: "Progres Qty" },
              ],
              rowActions: [{ label: "Release" }],
            },
          },
        ],
      },
    },
  },
  omnichannel: {
    label: "Omnichannel Marketplace & Shipping",
    document: {
      version: "1.0.0",
      id: "demo-omni-fulfillment",
      name: "Nusantara Omnichannel - Orders Fulfillment",
      dataSources: {
        orders: [
          { noPesanan: "ORD-SHP-99210", channel: "Lapakku Official", customer: "Rian Hidayat", item: "Sneakers Prime Classic", kurir: "KirimCepat", status: "Siap Pick & Pack" },
          { noPesanan: "ORD-TKP-88124", channel: "TokoPrima Pro", customer: "Maya Indah", item: "Slip-On Casual Leather", kurir: "ExpressOne Best", status: "Wave Picking" },
        ],
      },
      root: {
        id: "root-omni",
        type: "Column",
        style: { gap: "gap-4", padding: "p-6" },
        children: [
          {
            id: "orders-table",
            type: "DataTable",
            style: { width: "w-full" },
            props: {
              title: "Antrean Pesanan Masuk (Marketplace Fulfillment)",
              dataSource: "orders",
              columns: [
                { key: "noPesanan", label: "No. Pesanan" },
                { key: "channel", label: "Channel" },
                { key: "customer", label: "Customer" },
                { key: "item", label: "Item SKU" },
                { key: "kurir", label: "Kurir" },
                { key: "status", label: "Status" },
              ],
              rowActions: [{ label: "Resi" }],
            },
          },
        ],
      },
    },
  },
};

const AI_QUICK_PROMPTS = [
  { label: "Rental Mobil & Armada", prompt: "Buatkan konsol rental mobil dengan status armada, tarif harian, dan tabel booking" },
  { label: "Slip Gaji & Payroll", prompt: "Buatkan rekap gaji payroll karyawan dengan tunjangan, potongan BPJS, dan take home pay" },
  { label: "Hotel & Room Front Desk", prompt: "Buatkan sistem hotel front desk dengan status kamar occupied, check-out, dan tamu" },
  { label: "Gudang & Stock Batch", prompt: "Buatkan konsol inventory pergudangan dengan bin location, lot number, dan expiry" },
  { label: "Cafe & Resto POS", prompt: "Buatkan sistem kasir cafe resto dengan pesanan menu makanan, meja, dan total bill" },
];

export interface PlaygroundRouteProps {
  onBack: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export function PlaygroundRoute({ onBack, isDark = false, onToggleTheme }: PlaygroundRouteProps) {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("healthcare");
  const [jsonCode, setJsonCode] = useState<string>(() =>
    JSON.stringify(PLAYGROUND_PRESETS.healthcare.document, null, 2)
  );
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [aiIssues, setAiIssues] = useState<AiPipelineIssue[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedResult = useMemo(() => {
    try {
      const raw = JSON.parse(jsonCode);
      const parsed = DocumentSchema.safeParse(raw);
      if (!parsed.success) {
        return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "), document: null };
      }
      return { error: null, document: parsed.data };
    } catch (err) {
      return { error: (err as Error).message, document: null };
    }
  }, [jsonCode]);

  const handleSelectPreset = (key: string) => {
    setSelectedPresetKey(key);
    if (PLAYGROUND_PRESETS[key]) {
      setJsonCode(JSON.stringify(PLAYGROUND_PRESETS[key].document, null, 2));
    }
  };

  const handleFormat = () => {
    try {
      const obj = JSON.parse(jsonCode);
      setJsonCode(JSON.stringify(obj, null, 2));
    } catch {
      // ignore
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonCode);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonCode], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${parsedResult.document?.id ?? "custom-document"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonCode(content);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateAI = (promptText: string) => {
    if (!promptText.trim()) return;
    const result = executeAiPipeline(promptText);
    if (result.success && result.document) {
      setJsonCode(JSON.stringify(result.document, null, 2));
      setAiIssues([]);
      setIsAiModalOpen(false);
      setAiPromptInput("");
    } else {
      setAiIssues(result.issues);
    }
  };

  const handleUpdateNode = (updatedNode: UIDLNode) => {
    if (!parsedResult.document) return;

    function replaceNodeInTree(current: UIDLNode): UIDLNode {
      if (current.id === updatedNode.id) {
        return updatedNode;
      }
      if (current.children) {
        return {
          ...current,
          children: current.children.map(replaceNodeInTree),
        };
      }
      return current;
    }

    const updatedDoc: UIDLDocument = {
      ...parsedResult.document,
      root: replaceNodeInTree(parsedResult.document.root),
    };

    setJsonCode(JSON.stringify(updatedDoc, null, 2));
  };

  const currentTheme = isDark ? meridianDarkTheme : meridianLightTheme;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-[#0b0f14] text-gray-100" : "bg-gray-100 text-gray-900"}`}>
      {/* Playground Top Bar */}
      <header className={`flex items-center justify-between border-b px-6 py-3.5 ${isDark ? "border-gray-800 bg-[#151b23]" : "border-gray-200 bg-white"}`}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isDark ? "border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200" : "border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
            }`}
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5" />
            <span>Kembali ke Katalog</span>
          </button>
          <div>
            <h1 className="text-base font-bold flex items-center gap-2">
              <Icon name="beaker" className="h-4 w-4 text-indigo-500" />
              <span>uidl-runtime JSON Schema Playground</span>
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">Live Runtime</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Generator Button */}
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:from-purple-500 hover:to-indigo-500 transition-all"
          >
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            <span>AI Builder</span>
          </button>

          {/* Visual Inspector Toggle */}
          <button
            type="button"
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isInspectorOpen
                ? "border-indigo-600 bg-indigo-600 text-white"
                : isDark
                ? "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon name="wrench" className="h-3.5 w-3.5" />
            <span>Inspector</span>
          </button>

          {/* Preset Selector */}
          <select
            value={selectedPresetKey}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold outline-none ${
              isDark ? "border-gray-700 bg-gray-900 text-gray-200" : "border-gray-300 bg-white text-gray-800"
            }`}
          >
            {Object.entries(PLAYGROUND_PRESETS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isDark ? "border-gray-700 bg-gray-800 text-amber-300" : "border-gray-300 bg-white text-gray-700"
              }`}
              title="Toggle Dark / Light Theme"
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              <Icon name={isDark ? "sun" : "moon"} className="h-3.5 w-3.5" />
              <span>{isDark ? "Light" : "Dark"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Split-Pane Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 max-h-[calc(100vh-65px)] overflow-hidden">
        {/* Left Pane: Code Editor */}
        <div className={`flex flex-col rounded-xl border shadow-sm overflow-hidden ${isDark ? "border-gray-800 bg-[#151b23]" : "border-gray-200 bg-white"}`}>
          {/* Editor Header Tools */}
          <div className={`flex items-center justify-between border-b px-4 py-2.5 ${isDark ? "border-gray-800 bg-[#1c2430]" : "border-gray-100 bg-gray-50"}`}>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">UIDL Document JSON</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFormat}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
                title="Format JSON"
              >
                <Icon name="bolt" className="h-3.5 w-3.5" />
                <span>Format</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
              >
                {copyFeedback ? (
                  <>
                    <Icon name="check" className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Icon name="clipboard-copy" className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
              >
                <Icon name="download" className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
              >
                <Icon name="upload" className="h-3.5 w-3.5" />
                <span>Import</span>
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>

          {/* JSON Textarea */}
          <div className="flex-1 relative overflow-hidden">
            <textarea
              value={jsonCode}
              onChange={(e) => setJsonCode(e.target.value)}
              spellCheck={false}
              className={`w-full h-full p-4 font-mono text-xs leading-5 resize-none outline-none ${
                isDark ? "bg-[#0f1318] text-gray-200 selection:bg-indigo-900" : "bg-white text-gray-900 selection:bg-indigo-100"
              }`}
            />
          </div>

          {/* Schema Validation Status Banner */}
          <div className={`border-t px-4 py-2 text-xs flex items-center justify-between ${
            parsedResult.error
              ? isDark ? "border-red-900 bg-red-950/60 text-red-300" : "border-red-200 bg-red-50 text-red-700"
              : isDark ? "border-gray-800 bg-[#12161d] text-emerald-400" : "border-gray-100 bg-emerald-50 text-emerald-700"
          }`}>
            <div className="flex items-center gap-2 truncate">
              <span className="flex items-center gap-1.5">
                <Icon
                  name={parsedResult.error ? "x-circle" : "check-circle"}
                  className={`h-4 w-4 flex-shrink-0 ${parsedResult.error ? "text-red-500" : "text-emerald-500"}`}
                />
                {parsedResult.error ? "Schema / Parse Error:" : "Valid JSON UIDL Document"}
              </span>
              {parsedResult.error && <span className="font-mono truncate">{parsedResult.error}</span>}
            </div>
            <span className="font-mono text-[10px] text-gray-400">{jsonCode.length} chars</span>
          </div>
        </div>

        {/* Right Pane: Live Document Preview + Optional Inspector */}
        <div className={`flex rounded-xl border shadow-sm overflow-hidden ${isDark ? "border-gray-800 bg-[#151b23]" : "border-gray-200 bg-white"}`}>
          <div className="flex-1 flex flex-col min-w-0">
            <div className={`flex items-center justify-between border-b px-4 py-2.5 ${isDark ? "border-gray-800 bg-[#1c2430]" : "border-gray-100 bg-gray-50"}`}>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Live Visual Render</span>
              <span className="text-[11px] font-medium text-gray-400 truncate max-w-[200px]">
                {parsedResult.document ? parsedResult.document.name : "Waiting for valid document..."}
              </span>
            </div>

            {/*
              * The preview is a Meridian surface: `.meridian-ui` puts the document on the same 13px
              * type scale and layout metrics the widgets were designed against, so what the
              * playground shows matches what the demo pages render.
              */}
            <div
              data-testid="live-preview"
              className={`meridian-ui ${isDark ? "dark" : ""} flex-1 overflow-y-auto bg-white dark:bg-gray-875`}
            >
              {parsedResult.document ? (
                <UIDocumentRenderer
                  document={parsedResult.document}
                  theme={currentTheme}
                  dataSources={parsedResult.document.dataSources}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-400">
                  Perbaiki kesalahan JSON pada panel kiri untuk melihat rendering dokumen secara langsung.
                </div>
              )}
            </div>
          </div>

          {/* Embedded Visual Inspector Panel */}
          {isInspectorOpen && parsedResult.document && (
            <VisualInspectorPanel
              document={parsedResult.document}
              selectedNodeId={selectedNodeId}
              onSelectNodeId={setSelectedNodeId}
              onUpdateNode={handleUpdateNode}
              onClose={() => setIsInspectorOpen(false)}
              isDark={isDark}
            />
          )}
        </div>
      </div>

      {/* AI Prompt Synthesizer Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAiModalOpen(false)} aria-hidden="true" />
          <div className={`relative z-10 w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl ${
            isDark ? "border-gray-700 bg-[#151b23] text-gray-100" : "border-gray-200 bg-white text-gray-900"
          }`}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${isDark ? "border-gray-800 bg-[#1c2430]" : "border-gray-100 bg-gray-50/50"}`}>
              <div className="flex items-center gap-2">
                <Icon name="sparkles" className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold">AI Console & Document Synthesizer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className={`rounded p-1 text-xs ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
                aria-label="Close AI Builder modal"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Deskripsikan modul atau konsol yang ingin dibuat:
                </label>
                <textarea
                  rows={3}
                  value={aiPromptInput}
                  onChange={(e) => setAiPromptInput(e.target.value)}
                  placeholder="Contoh: Buatkan konsol rental mobil dengan status armada, tarif sewa harian, dan tabel booking pelanggan..."
                  className={`w-full rounded-lg border p-3 text-sm outline-none resize-none ${
                    isDark ? "border-gray-700 bg-gray-900 text-gray-100 focus:border-indigo-500" : "border-gray-300 bg-white text-gray-900 focus:border-indigo-600"
                  }`}
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Atau pilih contoh template cepat:
                </span>
                <div className="flex flex-wrap gap-2">
                  {AI_QUICK_PROMPTS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleGenerateAI(item.prompt)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        isDark ? "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white" : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {aiIssues.length > 0 && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Icon name="close" className="h-4 w-4 text-red-400" />
                    <span>Validasi AI Pipeline Gagal ({aiIssues.length} issue):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-300">
                    {aiIssues.map((issue, idx) => (
                      <li key={idx}>
                        <span className="uppercase font-mono text-[10px] bg-red-900/40 px-1 py-0.5 rounded mr-1">
                          [{issue.phase}]
                        </span>
                        {issue.path ? <code className="font-mono text-[10px] text-red-200 mr-1">{issue.path}:</code> : null}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAiModalOpen(false);
                    setAiIssues([]);
                  }}
                  className={`rounded-md border px-4 py-2 text-xs font-semibold ${
                    isDark ? "border-gray-700 bg-gray-800 text-gray-300" : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateAI(aiPromptInput)}
                  className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow hover:from-purple-500 hover:to-indigo-500"
                >
                  <Icon name="bolt" className="h-4 w-4" />
                  <span>Generate UIDL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
