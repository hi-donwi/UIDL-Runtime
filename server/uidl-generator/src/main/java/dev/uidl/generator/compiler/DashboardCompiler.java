package dev.uidl.generator.compiler;

import java.util.*;

import dev.uidl.generator.model.DashboardChart;
import dev.uidl.generator.model.DashboardKpi;
import dev.uidl.generator.model.DashboardPageMeta;
import dev.uidl.generator.model.DashboardShortcut;
import dev.uidl.generator.uidl.UidlDocument;
import dev.uidl.generator.uidl.UidlNode;
import dev.uidl.generator.validation.CapabilityValidator;

import static dev.uidl.generator.uidl.UidlNodeBuilder.node;

/**
 * Compiles a {@link DashboardPageMeta} into a UIDL document containing:
 * <ul>
 *   <li>Page header with title and actions</li>
 *   <li>KPI metric cards in a GridView</li>
 *   <li>Shortcut cards for quick module navigation</li>
 *   <li>Chart sections (primary chart + secondary charts grid)</li>
 * </ul>
 *
 * <p>Port of {@code compileDashboardPage()} from {@code packages/core/src/compiler/dashboard.ts}.
 */
public final class DashboardCompiler {

    private static final String TEXT_SECONDARY = "{primitives.color.text-secondary}";
    private static final String BORDER_COLOR = "{primitives.color.border}";

    private DashboardCompiler() {}

    public static UidlDocument compile(CompilePageInput.DashboardInput input) {
        var issues = CapabilityValidator.validate(input);
        if (!issues.isEmpty()) {
            throw new IllegalArgumentException(
                    "compileDashboardPage: hostCapabilities rejected: " +
                    issues.stream().map(i -> i.message()).reduce((a, b) -> a + "; " + b).orElse(""));
        }

        var meta = input.meta();
        String lang = (input.uiPolicy() != null && input.uiPolicy().lang() != null)
                ? input.uiPolicy().lang() : "id";

        String docId = "dashboard-" + meta.name().toLowerCase();
        String title = "id".equals(lang) && meta.label().id() != null
                ? meta.label().id()
                : (meta.label().en() != null ? meta.label().en() : meta.name());

        var children = new ArrayList<UidlNode>();

        // Header
        children.add(pageHeader(title, Collections.emptyList()));

        // KPIs
        if (meta.kpis() != null && !meta.kpis().isEmpty()) {
            var kpis = meta.kpis();
            var gridStyle = new LinkedHashMap<String, Object>();
            gridStyle.put("display", "grid");
            gridStyle.put("gridTemplateColumns", "repeat(" + kpis.size() + ", minmax(0, 1fr))");

            var kpiNodes = new ArrayList<UidlNode>();
            for (int i = 0; i < kpis.size(); i++) {
                var kpi = kpis.get(i);
                String labelStr = "id".equals(lang) && kpi.label().id() != null
                        ? kpi.label().id()
                        : (kpi.label().en() != null ? kpi.label().en() : "");

                var colStyle = new LinkedHashMap<String, Object>();
                colStyle.put("padding", "p-4");
                colStyle.put("gap", "gap-1");
                if (i < kpis.size() - 1) {
                    colStyle.put("borderWidth", "border-e");
                    colStyle.put("borderColor", BORDER_COLOR);
                }

                var labelNode = node("dashboard-kpis-kpi-" + i + "-label", "Text")
                        .props(Map.of("value", labelStr))
                        .style(Map.of("fontSize", "text-sm", "color", TEXT_SECONDARY))
                        .build();

                var valNode = node("dashboard-kpis-kpi-" + i + "-value", "Text")
                        .props(Map.of("value", String.valueOf(kpi.value())))
                        .style(Map.of("fontSize", "text-xl", "fontWeight", 600))
                        .build();

                kpiNodes.add(node("dashboard-kpis-kpi-" + i, "Column")
                        .style(colStyle)
                        .children(List.of(labelNode, valNode))
                        .build());
            }

            children.add(node("dashboard-kpis", "GridView")
                    .props(Map.of("style", gridStyle))
                    .style(Map.of("borderWidth", "border-b", "borderColor", BORDER_COLOR))
                    .children(kpiNodes)
                    .build());
        }

        // Shortcuts
        if (meta.shortcuts() != null && !meta.shortcuts().isEmpty()) {
            var listBase = input.routePolicy() != null && input.routePolicy().listBase() != null
                    ? input.routePolicy().listBase() : "/app/list";

            var shortcutNodes = new ArrayList<UidlNode>();
            for (int i = 0; i < meta.shortcuts().size(); i++) {
                var sc = meta.shortcuts().get(i);
                String targetRoute = sc.route() != null
                        ? sc.route()
                        : (listBase + "/" + sc.doctype()).replace("//", "/");

                String label = "id".equals(lang) && sc.label().id() != null
                        ? sc.label().id()
                        : (sc.label().en() != null ? sc.label().en() : sc.doctype());

                var scChildren = new ArrayList<UidlNode>();
                scChildren.add(node("shortcut-" + i + "-title", "Text")
                        .props(Map.of("value", label))
                        .style(Map.of("fontSize", "text-base", "fontWeight", 600))
                        .build());

                if (sc.description() != null) {
                    String descStr = "id".equals(lang) && sc.description().id() != null
                            ? sc.description().id() : sc.description().en();
                    if (descStr != null) {
                        scChildren.add(node("shortcut-" + i + "-desc", "Text")
                                .props(Map.of("value", descStr))
                                .style(Map.of("fontSize", "text-sm", "color", TEXT_SECONDARY, "marginTop", "mt-1"))
                                .build());
                    }
                }

                var containerProps = new LinkedHashMap<String, Object>();
                containerProps.put("className", "flex flex-col p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-875 hover:bg-gray-50 dark:hover:bg-gray-850 cursor-pointer shadow-sm transition-colors");

                shortcutNodes.add(node("shortcut-" + i, "Container")
                        .props(containerProps)
                        .events(Map.of("onClick", List.of(Collections.singletonMap("navigate", Collections.singletonMap("route", targetRoute)))))
                        .children(scChildren)
                        .build());
            }

            var gridProps = new LinkedHashMap<String, Object>();
            gridProps.put("display", "grid");
            gridProps.put("gridTemplateColumns", "repeat(auto-fill, minmax(220px, 1fr))");

            var gridNode = node("shortcuts-grid", "GridView")
                    .props(Map.of("style", gridProps))
                    .style(Map.of("gap", "gap-4"))
                    .children(shortcutNodes)
                    .build();

            var titleNode = node("shortcuts-title", "Text")
                    .props(Map.of("value", "id".equals(lang) ? "Akses Cepat Modul" : "Quick Navigation"))
                    .style(Map.of("fontSize", "text-base", "fontWeight", 600))
                    .build();

            var scSectionStyle = new LinkedHashMap<String, Object>();
            scSectionStyle.put("padding", "p-4");
            scSectionStyle.put("gap", "gap-4");
            scSectionStyle.put("borderWidth", "border-b");
            scSectionStyle.put("borderColor", BORDER_COLOR);

            children.add(node("shortcuts-section", "Column")
                    .style(scSectionStyle)
                    .children(List.of(titleNode, gridNode))
                    .build());
        }

        // Charts
        if (meta.charts() != null && !meta.charts().isEmpty()) {
            var chartNodes = new ArrayList<UidlNode>();
            for (var chart : meta.charts()) {
                String chartTitle = "id".equals(lang) && chart.title().id() != null
                        ? chart.title().id()
                        : (chart.title().en() != null ? chart.title().en() : chart.id());

                var chartProps = new LinkedHashMap<String, Object>();
                chartProps.put("title", chartTitle);
                chartProps.put("chartType", chart.type());
                chartProps.put("xKey", chart.xKey());
                chartProps.put("yKey", chart.yKey());
                if (chart.dataSource() instanceof String s) {
                    chartProps.put("dataSource", s);
                } else if (chart.dataSource() instanceof List<?> l) {
                    chartProps.put("rows", l);
                }

                chartNodes.add(node("chart-" + chart.id(), "Chart")
                        .props(chartProps)
                        .style(chart.style() != null ? chart.style() : Map.of("width", "w-full"))
                        .build());
            }

            var primaryChart = chartNodes.get(0);
            var sectionStyle = new LinkedHashMap<String, Object>();
            sectionStyle.put("padding", "p-4");
            sectionStyle.put("gap", "gap-4");
            sectionStyle.put("borderWidth", "border-b");
            sectionStyle.put("borderColor", BORDER_COLOR);

            children.add(node("cashflow-section", "Column")
                    .style(sectionStyle)
                    .children(List.of(primaryChart))
                    .build());

            if (chartNodes.size() > 1) {
                var secondaryCharts = chartNodes.subList(1, chartNodes.size());
                var gridProps = new LinkedHashMap<String, Object>();
                gridProps.put("display", "grid");
                gridProps.put("gridTemplateColumns", "repeat(auto-fit, minmax(280px, 1fr))");

                children.add(node("pnl-expenses-section", "GridView")
                        .props(Map.of("style", gridProps))
                        .style(sectionStyle)
                        .children(secondaryCharts)
                        .build());
            }
        }

        // DataSources
        var dataSources = new LinkedHashMap<String, Object>();
        if (meta.dataSources() != null) {
            dataSources.putAll(meta.dataSources());
        }
        if (meta.charts() != null) {
            for (var chart : meta.charts()) {
                if (chart.dataSource() instanceof List<?> list) {
                    dataSources.put("chart_" + chart.id(), list);
                }
            }
        }

        var pageRoot = node("page", "Column")
                .style(Map.of("gap", "gap-0", "fontSize", "text-base", "width", "w-full"))
                .children(children)
                .build();

        return new UidlDocument(
                UidlDocument.SPEC_VERSION,
                docId,
                title,
                "/app/dashboard/" + meta.name(),
                null,
                null,
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

        var titleNode = node("dashboard-header-title", "Text")
                .props(Map.of("value", title, "heading", 1))
                .style(Map.of("fontSize", "text-xl", "fontWeight", 600))
                .build();

        var actionsNode = node("dashboard-header-actions", "Toolbar")
                .style(Map.of("display", "flex", "gap", "gap-2"))
                .children(actions)
                .build();

        return node("dashboard-header", "Navbar")
                .style(style)
                .children(List.of(titleNode, actionsNode))
                .build();
    }
}
