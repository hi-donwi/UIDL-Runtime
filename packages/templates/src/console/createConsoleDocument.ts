/*
 * A company console page as a JSON-UIDL document.
 *
 * Laid out the way Meridian lays out its Dashboard (Dashboard): flat `p-4` regions
 * stacked on the page background and separated by rules, never cards on a canvas. The page
 * header is FormHeader's `h-row-large px-4 text-xl font-semibold` bar; the figures row is
 * `meridianKpiRow` (cells divided by `border-e`); charts and tables sit directly on the page, each
 * closed by a `border-b`.
 */
import { meridianKpiRow, meridianPageHeader } from "../meridian/meridianLayout";
import { resolveActionIcon } from "../meridian/iconRules";
import type { CompanyDemo, PageSpec } from "./types";

export function createConsoleDocument(company: CompanyDemo, pageId: string, page: PageSpec) {
  const border = "{primitives.color.border}";
  return {
    version: "1.0.0",
    id: `${company.id}-${pageId}`,
    name: `${company.title} ${page.module}`,
    dataSources: {
      chart: page.chartRows,
      ...Object.fromEntries(page.tables.map((table, index) => [`table${index}`, table.rows])),
    },
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base" },
      children: [
        meridianPageHeader(
          page.module,
          page.actions.map((label, index) => ({
            id: `action-${index}`,
            type: "Button",
            props: {
              label,
              variant: index === 0 ? "primary" : "secondary",
              // Meridian's Button keeps an icon slot ahead of the label; the icon is derived
              // from the verb so a new action never ships without one.
              iconName: resolveActionIcon(label),
            },
            events: {
              onClick: [
                {
                  setState: {
                    path: "toast",
                    value: `Aksi [${label}] berhasil dijalankan pada ${company.company}`,
                  },
                },
              ],
            },
          })),
        ),
        meridianKpiRow("kpis", page.kpis),
        {
          id: "chart-section",
          type: "Column",
          style: { padding: "p-4", borderWidth: "border-b", borderColor: border },
          children: [
            {
              id: "chart",
              type: "Chart",
              props: { title: page.chartTitle, chartType: page.chartType, xKey: "label", yKey: "value", dataSource: "chart" },
              style: { width: "w-full" },
            },
          ],
        },
        ...page.tables.map((table, index) => ({
          id: `table-${index}`,
          type: "DataTable",
          style: { width: "w-full", borderWidth: "border-b", borderColor: border },
          props: {
            title: table.title,
            dataSource: `table${index}`,
            columns: table.columns,
            rowActions: table.rowActions?.map((action) => ({ ...action, event: action.label })) ?? [{ label: "Detail", event: "Detail" }],
          },
          events: {
            onRowAction: [
              {
                setState: {
                  path: "selectedRecord",
                  value: {
                    $bind: "event",
                  },
                },
              },
            ],
            ...Object.fromEntries(
              (table.rowActions ?? [{ label: "Detail" }]).map((action) => [
                action.label,
                [
                  {
                    setState: {
                      path: "rowActionTrigger",
                      value: {
                        action: action.label,
                        record: { $bind: "event" },
                      },
                    },
                  },
                  {
                    setState: {
                      path: "selectedRecord",
                      value: { $bind: "event" },
                    },
                  },
                ],
              ]),
            ),
          },
        })),
      ],
    },
  };
}
