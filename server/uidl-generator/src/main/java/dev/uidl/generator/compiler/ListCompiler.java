package dev.uidl.generator.compiler;

import java.util.*;

import dev.uidl.generator.id.SemanticNodeId;
import dev.uidl.generator.model.*;
import dev.uidl.generator.policy.RoutePolicy;
import dev.uidl.generator.uidl.UidlDocument;
import dev.uidl.generator.uidl.UidlNode;
import dev.uidl.generator.uidl.UidlNodeBuilder;
import dev.uidl.generator.validation.CapabilityValidator;

import static dev.uidl.generator.uidl.UidlNodeBuilder.node;

/**
 * Compiles a {@link ListPageMeta} into a UIDL document containing:
 * <ul>
 *   <li>A search field + filter controls in a toolbar</li>
 *   <li>A DataTable bound to a {@code $query} data source</li>
 *   <li>Pagination controls</li>
 *   <li>A "Create New" button</li>
 * </ul>
 *
 * <p>Port of {@code compileListPage()} from {@code packages/core/src/compiler/list.ts}.
 */
public final class ListCompiler {

    private ListCompiler() {}

    public static UidlDocument compile(CompilePageInput.ListInput input) {
        // Fail-closed host gate
        var issues = CapabilityValidator.validate(input);
        if (!issues.isEmpty()) {
            throw new IllegalArgumentException(
                    "compileListPage: hostCapabilities rejected: " +
                    issues.stream().map(i -> i.message()).reduce((a, b) -> a + "; " + b).orElse(""));
        }

        var meta = input.meta();
        var routePolicy = input.routePolicy() != null ? input.routePolicy() : RoutePolicy.DEFAULT;
        var lang = input.uiPolicy() != null && input.uiPolicy().lang() != null
                ? input.uiPolicy().lang() : "en";

        String docId = "list-" + meta.name().toLowerCase();
        String title = meta.label().en();
        String ids_search = SemanticNodeId.listSearch(meta.name());
        String ids_table = SemanticNodeId.listTable(meta.name());
        String ids_page = SemanticNodeId.listPage(meta.name());

        int defaultPageSize = meta.pageSize() != null ? meta.pageSize() : 20;

        // --- State ---
        var state = new LinkedHashMap<String, Object>();
        state.put("page", 1);
        state.put("pageSize", defaultPageSize);
        state.put("sortField", meta.defaultSort().field());
        state.put("sortDir", meta.defaultSort().dir());
        state.put("search", "");
        state.put("filterOpen", false);

        if (meta.filters() != null) {
            for (var filter : meta.filters()) {
                state.put("filter_" + filter.field(), "");
            }
        }

        // --- DataSources ---
        var queryFilters = new ArrayList<Map<String, Object>>();
        if (meta.filters() != null) {
            for (var f : meta.filters()) {
                String op = "DateRange".equals(f.widget()) ? "between" : "eq";
                queryFilters.add(Map.of(
                        "field", f.field(),
                        "op", op,
                        "value", Map.of("$bind", "state.filter_" + f.field())
                ));
            }
        }

        var queryDesc = new LinkedHashMap<String, Object>();
        queryDesc.put("collection", meta.name());
        if (!queryFilters.isEmpty()) {
            queryDesc.put("filters", queryFilters);
        }
        queryDesc.put("sort", List.of(Map.of(
                "field", Map.of("$bind", "state.sortField"),
                "dir", Map.of("$bind", "state.sortDir")
        )));
        queryDesc.put("page", Map.of(
                "number", Map.of("$bind", "state.page"),
                "size", Map.of("$bind", "state.pageSize")
        ));
        queryDesc.put("search", Map.of("$bind", "state.search"));

        var dataSources = Map.<String, Object>of("rows", Map.of("$query", queryDesc));

        // --- Filter controls ---
        var filterChildren = new ArrayList<UidlNode>();

        // Search field
        filterChildren.add(node(ids_search, "TextField")
                .props(linkedMap(
                        "label", "Search",
                        "placeholder", "Search " + title + "…",
                        "value", Map.of("$bind", "state.search")
                ))
                .style(Map.of("width", "w-64"))
                .events(Map.of("onChange", List.of(
                        Map.of("setState", Map.of("path", "search", "value", JSONNull.INSTANCE)),
                        Map.of("setState", Map.of("path", "page", "value", 1))
                )))
                .build());

        // Per-filter controls
        if (meta.filters() != null) {
            for (var filter : meta.filters()) {
                var fieldMeta = meta.fields().stream()
                        .filter(f -> f.key().equals(filter.field()))
                        .findFirst().orElse(null);
                String filterLabel = fieldMeta != null ? fieldMeta.label().en() : filter.field();

                var filterEvents = Map.<String, Object>of("onChange", List.of(
                        Map.of("setState", Map.of("path", "filter_" + filter.field(), "value", JSONNull.INSTANCE)),
                        Map.of("setState", Map.of("path", "page", "value", 1))
                ));

                if ("Select".equals(filter.widget())) {
                    var optionsList = new ArrayList<Map<String, String>>();
                    optionsList.add(Map.of("value", "", "label", "All " + filterLabel));

                    if (filter.options() != null) {
                        filter.options().forEach(o -> optionsList.add(Map.of("value", o.value(), "label", o.label())));
                    } else if (fieldMeta != null && fieldMeta.options() != null) {
                        fieldMeta.options().forEach(o -> optionsList.add(Map.of("value", o.value(), "label", o.label())));
                    }

                    filterChildren.add(node("filter-" + filter.field(), "Select")
                            .props(linkedMap(
                                    "label", filterLabel,
                                    "value", Map.of("$bind", "state.filter_" + filter.field()),
                                    "options", optionsList
                            ))
                            .style(Map.of("width", "w-52"))
                            .events(filterEvents)
                            .build());
                } else {
                    filterChildren.add(node("filter-" + filter.field(), "TextField")
                            .props(linkedMap(
                                    "label", filterLabel,
                                    "placeholder", "Search " + filterLabel + "…",
                                    "value", Map.of("$bind", "state.filter_" + filter.field())
                            ))
                            .style(Map.of("width", "w-48"))
                            .events(filterEvents)
                            .build());
                }
            }
        }

        // Reset button
        var resetActions = new ArrayList<Map<String, Object>>();
        resetActions.add(Map.of("setState", Map.of("path", "search", "value", "")));
        resetActions.add(Map.of("setState", Map.of("path", "page", "value", 1)));
        if (meta.filters() != null) {
            for (var f : meta.filters()) {
                resetActions.add(Map.of("setState", Map.of("path", "filter_" + f.field(), "value", "")));
            }
        }
        filterChildren.add(node("reset-filters-btn", "Button")
                .props(Map.of("label", "Reset", "variant", "secondary"))
                .events(Map.of("onClick", resetActions))
                .build());

        // --- Table columns ---
        var tableColumns = new ArrayList<Map<String, Object>>();
        for (var col : meta.columns()) {
            var fieldMeta = meta.fields().stream()
                    .filter(f -> f.key().equals(col.field()))
                    .findFirst().orElse(null);
            String colLabel = fieldMeta != null ? fieldMeta.label().en() : col.field();
            String format = cellFormatFor(col.field(), fieldMeta, meta.statusField());

            var colMap = new LinkedHashMap<String, Object>();
            colMap.put("key", col.field());
            colMap.put("label", colLabel);
            if (col.width() != null) colMap.put("width", col.width());
            colMap.put("format", format);
            if (col.align() != null) colMap.put("align", col.align());
            tableColumns.add(colMap);
        }

        // --- Create new button ---
        String newRoute = routePolicy.resolveListRoute(meta.name()) + "/new";
        var createBtn = node("create-btn", "Button")
                .props(Map.of("label", "Create New", "variant", "primary"))
                .events(Map.of("onClick", List.of(
                        Map.of("navigate", Map.of("route", newRoute))
                )))
                .build();

        // --- Table summary ---
        List<Map<String, Object>> summaryProps = null;
        if (meta.summaries() != null && !meta.summaries().isEmpty()) {
            summaryProps = new ArrayList<>();
            for (var s : meta.summaries()) {
                summaryProps.add(linkedMap(
                        "label", s.label().en(),
                        "agg", s.agg(),
                        "field", s.field()
                ));
            }
        }

        // --- DataTable node ---
        var tableProps = new LinkedHashMap<String, Object>();
        tableProps.put("columns", tableColumns);
        tableProps.put("dataSource", "rows");
        tableProps.put("titleField", meta.titleField());
        if (summaryProps != null) tableProps.put("summaries", summaryProps);

        var tableNode = node(ids_table, "DataTable")
                .props(tableProps)
                .events(Map.of("onSort", List.of(
                        Map.of("setState", Map.of("path", "sortField", "value", JSONNull.INSTANCE)),
                        Map.of("setState", Map.of("path", "sortDir", "value", JSONNull.INSTANCE)),
                        Map.of("setState", Map.of("path", "page", "value", 1))
                )))
                .build();

        // --- Pagination ---
        var paginationNode = node(ids_page, "Container")
                .style(Map.of("display", "flex", "justifyContent", "space-between", "alignItems", "center",
                        "padding", "12px 0"))
                .children(
                        node(ids_page + "-prev", "Button")
                                .props(Map.of("label", "Previous", "variant", "secondary"))
                                .events(Map.of("onClick", List.of(
                                        Map.of("setState", Map.of("path", "page",
                                                "value", Map.of("op", "subtract",
                                                        "left", Map.of("$bind", "state.page"),
                                                        "right", Map.of("literal", 1))))
                                )))
                                .visibility(Map.of("condition", Map.of("op", "gt",
                                        "left", Map.of("$bind", "state.page"),
                                        "right", Map.of("literal", 1))))
                                .build(),
                        node(ids_page + "-info", "Text")
                                .props(Map.of("text", Map.of("$bind", "state.page")))
                                .build(),
                        node(ids_page + "-next", "Button")
                                .props(Map.of("label", "Next", "variant", "secondary"))
                                .events(Map.of("onClick", List.of(
                                        Map.of("setState", Map.of("path", "page",
                                                "value", Map.of("op", "add",
                                                        "left", Map.of("$bind", "state.page"),
                                                        "right", Map.of("literal", 1))))
                                )))
                                .build()
                )
                .build();

        // --- Toolbar ---
        var toolbar = node(SemanticNodeId.toolbar("list", meta.name()), "Row")
                .style(Map.of("gap", "12px", "alignItems", "flex-end", "flexWrap", "wrap",
                        "padding", "16px 0"))
                .children(filterChildren)
                .build();

        // --- Root ---
        var root = node(SemanticNodeId.root("list", meta.name()), "Container")
                .children(List.of(
                        node("header", "Row")
                                .style(Map.of("justifyContent", "space-between", "alignItems", "center",
                                        "padding", "16px 0"))
                                .children(
                                        node("title", "Text")
                                                .props(Map.of("text", title, "variant", "h4"))
                                                .build(),
                                        createBtn
                                )
                                .build(),
                        toolbar,
                        tableNode,
                        paginationNode
                ))
                .build();

        return new UidlDocument(
                UidlDocument.SPEC_VERSION,
                docId,
                title,
                routePolicy.resolveListRoute(meta.name()),
                null,
                state,
                dataSources,
                null,
                root
        );
    }

    // --- Helpers ---

    private static String cellFormatFor(String field, FieldMeta fieldMeta, String statusField) {
        if (statusField != null && field.equals(statusField)) return "status";
        if (fieldMeta != null && fieldMeta.format() != null) return fieldMeta.format().value();
        if (fieldMeta == null) return "text";
        return switch (fieldMeta.widget()) {
            case CURRENCY -> "currency";
            case DATE -> "date";
            case CHECKBOX, SWITCH -> "check";
            default -> "text";
        };
    }

    /**
     * Creates a LinkedHashMap preserving insertion order — crucial for deterministic JSON output.
     */
    @SuppressWarnings("unchecked")
    private static <V> LinkedHashMap<String, V> linkedMap(Object... kvPairs) {
        var map = new LinkedHashMap<String, V>();
        for (int i = 0; i < kvPairs.length; i += 2) {
            map.put((String) kvPairs[i], (V) kvPairs[i + 1]);
        }
        return map;
    }

    /**
     * Sentinel for JSON null values in event handlers (where {@code value: null} means
     * "use the event value", not "set to nothing").
     */
    public enum JSONNull {
        INSTANCE;
    }
}
