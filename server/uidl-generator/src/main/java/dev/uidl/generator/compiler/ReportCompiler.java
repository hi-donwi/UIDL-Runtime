package dev.uidl.generator.compiler;

import java.util.*;

import dev.uidl.generator.model.ReportColumn;
import dev.uidl.generator.model.ReportFilter;
import dev.uidl.generator.model.ReportPageMeta;
import dev.uidl.generator.model.ReportSummary;
import dev.uidl.generator.uidl.UidlDocument;
import dev.uidl.generator.uidl.UidlNode;
import dev.uidl.generator.validation.CapabilityValidator;

import static dev.uidl.generator.uidl.UidlNodeBuilder.node;

/**
 * Compiles a {@link ReportPageMeta} into a UIDL document containing:
 * <ul>
 *   <li>Page header with title and Export button</li>
 *   <li>Filter controls in a toolbar</li>
 *   <li>Summary cards (aggregates / totals) in a GridView</li>
 *   <li>A DataTable for report rows</li>
 * </ul>
 *
 * <p>Port of {@code compileReportPage()} from {@code packages/core/src/compiler/report.ts}.
 */
public final class ReportCompiler {

    private static final String BORDER_COLOR = "{primitives.color.border}";
    private static final String TEXT_SECONDARY = "{primitives.color.text-secondary}";

    private ReportCompiler() {}

    @SuppressWarnings("unchecked")
    public static UidlDocument compile(CompilePageInput.ReportInput input) {
        var issues = CapabilityValidator.validate(input);
        if (!issues.isEmpty()) {
            throw new IllegalArgumentException(
                    "compileReportPage: hostCapabilities rejected: " +
                    issues.stream().map(i -> i.message()).reduce((a, b) -> a + "; " + b).orElse(""));
        }

        var meta = input.meta();
        String lang = (input.uiPolicy() != null && input.uiPolicy().lang() != null)
                ? input.uiPolicy().lang() : "id";

        String docId = "report-" + meta.name().toLowerCase();
        String title = "id".equals(lang) && meta.label().id() != null
                ? meta.label().id()
                : (meta.label().en() != null ? meta.label().en() : meta.name());

        // --- State ---
        var state = new LinkedHashMap<String, Object>();
        if (meta.filters() != null) {
            for (var filter : meta.filters()) {
                state.put("filter_" + filter.field(), filter.defaultValue() != null ? filter.defaultValue() : "");
            }
        }

        // --- DataSources ---
        var dataSources = new LinkedHashMap<String, Object>();
        Object rawDs = meta.dataSource();
        if (rawDs instanceof String) {
            // Named reference — host will resolve
        } else if (rawDs instanceof List<?> list) {
            dataSources.put("rows", list);
        } else if (rawDs instanceof Map<?, ?> map && map.containsKey("$query")) {
            Map<String, Object> rawQuery = new LinkedHashMap<>((Map<String, Object>) map.get("$query"));
            var filterBinds = new ArrayList<Map<String, Object>>();
            if (meta.filters() != null) {
                for (var f : meta.filters()) {
                    var fMap = new LinkedHashMap<String, Object>();
                    fMap.put("field", f.field());
                    fMap.put("op", "DateRange".equals(f.widget()) ? "between" : "eq");
                    fMap.put("value", Map.of("$bind", "state.filter_" + f.field()));
                    filterBinds.add(fMap);
                }
            }
            if (!filterBinds.isEmpty()) {
                rawQuery.put("filters", filterBinds);
            }
            dataSources.put("rows", Map.of("$query", rawQuery));
        } else if (rawDs instanceof Map<?, ?> map) {
            dataSources.put("rows", map);
        }

        var children = new ArrayList<UidlNode>();

        // --- Header Actions ---
        var headerActions = new ArrayList<UidlNode>();
        var exportProps = new LinkedHashMap<String, Object>();
        exportProps.put("label", "id".equals(lang) ? "Ekspor" : "Export");
        exportProps.put("variant", "secondary");
        headerActions.add(node("export-report-btn", "Button")
                .props(exportProps)
                .build());

        children.add(pageHeader(title, headerActions));

        // --- Filters ---
        if (meta.filters() != null && !meta.filters().isEmpty()) {
            var filterNodes = new ArrayList<UidlNode>();
            for (var filter : meta.filters()) {
                String label = "id".equals(lang) && filter.label().id() != null
                        ? filter.label().id()
                        : (filter.label().en() != null ? filter.label().en() : filter.field());

                if ("Select".equals(filter.widget())) {
                    var options = new ArrayList<Map<String, String>>();
                    options.add(Map.of("value", "", "label", "id".equals(lang) ? "Semua " + label : "All " + label));
                    if (filter.options() != null) {
                        for (var opt : filter.options()) {
                            options.add(Map.of("value", opt.value(), "label", opt.label()));
                        }
                    }
                    var selProps = new LinkedHashMap<String, Object>();
                    selProps.put("label", label);
                    selProps.put("value", Map.of("$bind", "state.filter_" + filter.field()));
                    selProps.put("options", options);

                    filterNodes.add(node("filter-" + filter.field(), "Select")
                            .style(Map.of("width", "w-52"))
                            .props(selProps)
                            .events(changeEvent("filter_" + filter.field()))
                            .build());
                } else {
                    var tfProps = new LinkedHashMap<String, Object>();
                    tfProps.put("label", label);
                    tfProps.put("placeholder", label);
                    tfProps.put("value", Map.of("$bind", "state.filter_" + filter.field()));

                    filterNodes.add(node("filter-" + filter.field(), "TextField")
                            .style(Map.of("width", "w-48"))
                            .props(tfProps)
                            .events(changeEvent("filter_" + filter.field()))
                            .build());
                }
            }

            var stripStyle = new LinkedHashMap<String, Object>();
            stripStyle.put("display", "flex");
            stripStyle.put("alignItems", "center");
            stripStyle.put("gap", "gap-3");
            stripStyle.put("padding", "p-4");
            stripStyle.put("borderWidth", "border-b");
            stripStyle.put("borderColor", BORDER_COLOR);

            children.add(node("report-filter-strip", "Toolbar")
                    .style(stripStyle)
                    .children(filterNodes)
                    .build());
        }

        // --- Summaries ---
        if (meta.summaries() != null && !meta.summaries().isEmpty()) {
            var summaries = meta.summaries();
            var gridStyle = new LinkedHashMap<String, Object>();
            gridStyle.put("display", "grid");
            gridStyle.put("gridTemplateColumns", "repeat(" + summaries.size() + ", minmax(0, 1fr))");

            var summaryNodes = new ArrayList<UidlNode>();
            for (int i = 0; i < summaries.size(); i++) {
                var summary = summaries.get(i);
                String labelStr = "id".equals(lang) && summary.label().id() != null
                        ? summary.label().id()
                        : (summary.label().en() != null ? summary.label().en() : "");

                var colStyle = new LinkedHashMap<String, Object>();
                colStyle.put("padding", "p-4");
                colStyle.put("gap", "gap-1");
                if (i < summaries.size() - 1) {
                    colStyle.put("borderWidth", "border-e");
                    colStyle.put("borderColor", BORDER_COLOR);
                }

                var labelNode = node("summary-" + i + "-label", "Text")
                        .props(Map.of("value", labelStr))
                        .style(Map.of("fontSize", "text-sm", "color", TEXT_SECONDARY))
                        .build();

                UidlNode valNode;
                if (summary.agg() != null) {
                    var expr = new LinkedHashMap<String, Object>();
                    expr.put("agg", summary.agg());
                    expr.put("over", "data.rows");
                    if (!"count".equals(summary.agg())) {
                        expr.put("field", summary.field());
                    }
                    var valProps = new LinkedHashMap<String, Object>();
                    valProps.put("value", Map.of("$expr", expr));
                    valProps.put("format", "count".equals(summary.agg()) ? "integer" : (summary.format() != null ? summary.format() : "number"));
                    valProps.put("locale", "id".equals(lang) ? "id-ID" : "en-US");
                    if (input.uiPolicy() != null && input.uiPolicy().currency() != null) {
                        valProps.put("currency", input.uiPolicy().currency());
                    }

                    valNode = node("summary-" + i + "-value", "Text")
                            .props(valProps)
                            .style(Map.of("fontSize", "text-xl", "fontWeight", 600))
                            .build();
                } else {
                    valNode = node("summary-" + i + "-value", "Text")
                            .props(Map.of("value", summary.value() != null ? String.valueOf(summary.value()) : ""))
                            .style(Map.of("fontSize", "text-xl", "fontWeight", 600))
                            .build();
                }

                summaryNodes.add(node("summary-" + i, "Column")
                        .style(colStyle)
                        .children(List.of(labelNode, valNode))
                        .build());
            }

            children.add(node("report-summary-strip", "GridView")
                    .props(Map.of("style", gridStyle))
                    .style(Map.of("borderWidth", "border-b", "borderColor", BORDER_COLOR))
                    .children(summaryNodes)
                    .build());
        }

        // --- Table Columns ---
        var tableColumns = new ArrayList<Map<String, Object>>();
        for (var col : meta.columns()) {
            var colMap = new LinkedHashMap<String, Object>();
            colMap.put("key", col.key());
            colMap.put("label", col.label());
            if (col.align() != null) colMap.put("align", col.align());
            if (col.width() != null) colMap.put("width", col.width());
            if (col.format() != null) colMap.put("format", col.format().value());
            tableColumns.add(colMap);
        }

        var tableProps = new LinkedHashMap<String, Object>();
        tableProps.put("dataSource", rawDs instanceof String s ? s : "rows");
        tableProps.put("columns", tableColumns);
        tableProps.put("paginate", false);
        tableProps.put("locale", "id".equals(lang) ? "id-ID" : "en-US");
        if (input.uiPolicy() != null && input.uiPolicy().currency() != null) {
            tableProps.put("currency", input.uiPolicy().currency());
        }

        children.add(node("report-table", "DataTable")
                .props(tableProps)
                .style(Map.of("width", "w-full"))
                .build());

        var pageRoot = node("page", "Column")
                .style(Map.of("fontSize", "text-base", "width", "w-full"))
                .children(children)
                .build();

        return new UidlDocument(
                UidlDocument.SPEC_VERSION,
                docId,
                title,
                "/app/report/" + meta.name(),
                null,
                state.isEmpty() ? null : state,
                dataSources.isEmpty() ? null : dataSources,
                null,
                pageRoot
        );
    }

    private static UidlNode pageHeader(String title, List<UidlNode> actions) {
        var style = new LinkedHashMap<String, Object>();
        style.put("display", "flex");
        style.put("justifyContent", "space-between");
        style.put("alignItems", "center");
        style.put("padding", "px-4");
        style.put("height", "h-row-large");
        style.put("borderWidth", "border-b");
        style.put("borderColor", BORDER_COLOR);

        var titleNode = node("report-header-title", "Text")
                .props(Map.of("value", title, "heading", 1))
                .style(Map.of("fontSize", "text-xl", "fontWeight", 600))
                .build();

        var actionsNode = node("report-header-actions", "Toolbar")
                .style(Map.of("display", "flex", "gap", "gap-2"))
                .children(actions)
                .build();

        return node("report-header", "Navbar")
                .style(style)
                .children(List.of(titleNode, actionsNode))
                .build();
    }

    private static Map<String, Object> changeEvent(String path) {
        var map = new LinkedHashMap<String, Object>();
        var setStateMap = new LinkedHashMap<String, Object>();
        setStateMap.put("path", path);
        setStateMap.put("value", null);
        map.put("onChange", List.of(Collections.singletonMap("setState", setStateMap)));
        return map;
    }
}
