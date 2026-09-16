package dev.uidl.generator.compiler;

import java.util.*;

import dev.uidl.generator.model.TreeNode;
import dev.uidl.generator.model.TreePageMeta;
import dev.uidl.generator.uidl.UidlDocument;
import dev.uidl.generator.uidl.UidlNode;
import dev.uidl.generator.validation.CapabilityValidator;

import static dev.uidl.generator.uidl.UidlNodeBuilder.node;

/**
 * Compiles a {@link TreePageMeta} into a UIDL document containing:
 * <ul>
 *   <li>Page header with title and Create button</li>
 *   <li>Search filter in a toolbar</li>
 *   <li>Two-pane layout: TreeView on the left, detail panel on the right</li>
 * </ul>
 *
 * <p>Port of {@code compileTreePage()} from {@code packages/core/src/compiler/tree.ts}.
 */
public final class TreeCompiler {

    private static final String BORDER_COLOR = "{primitives.color.border}";

    private TreeCompiler() {}

    public static UidlDocument compile(CompilePageInput.TreeInput input) {
        var issues = CapabilityValidator.validate(input);
        if (!issues.isEmpty()) {
            throw new IllegalArgumentException(
                    "compileTreePage: hostCapabilities rejected: " +
                    issues.stream().map(i -> i.message()).reduce((a, b) -> a + "; " + b).orElse(""));
        }

        var meta = input.meta();
        String lang = (input.uiPolicy() != null && input.uiPolicy().lang() != null)
                ? input.uiPolicy().lang() : "id";

        String docId = "tree-" + meta.name().toLowerCase();
        String title = "id".equals(lang) && meta.label().id() != null
                ? meta.label().id()
                : (meta.label().en() != null ? meta.label().en() : meta.name());

        var state = new LinkedHashMap<String, Object>();
        state.put("selectedKey", "");
        state.put("search", "");

        var formBase = input.routePolicy() != null && input.routePolicy().formBase() != null
                ? input.routePolicy().formBase() : "/app/edit";
        String createRoute = (formBase + "/" + meta.name() + "/new").replace("//", "/");

        String createLabel = "id".equals(lang)
                ? "+ " + (meta.label().id() != null ? meta.label().id() : meta.name())
                : "+ New " + (meta.label().en() != null ? meta.label().en() : meta.name());

        var createButton = node("tree-create-btn", "Button")
                .props(Map.of("label", createLabel, "variant", "primary"))
                .events(Map.of("onClick", List.of(Collections.singletonMap("navigate", Collections.singletonMap("route", createRoute)))))
                .build();

        var searchNode = node("tree-search", "TextField")
                .style(Map.of("width", "w-64"))
                .props(Map.of("placeholder", "id".equals(lang) ? "Cari…" : "Search…", "value", Map.of("$bind", "state.search")))
                .events(changeEvent("search"))
                .build();

        List<Map<String, Object>> treeItems = meta.nodes().stream()
                .map(n -> toTreeItem(n, lang))
                .toList();

        var treeProps = new LinkedHashMap<String, Object>();
        treeProps.put("title", title);
        treeProps.put("items", treeItems);

        var treeViewNode = node("tree-view", "TreeView")
                .props(treeProps)
                .events(Map.of("onNodeClick", List.of(Collections.singletonMap("setState", Map.of("path", "selectedKey", "value", Map.of("$bind", "event.id"))))))
                .style(Map.of("width", "w-full", "padding", "p-4"))
                .build();

        var detailPanel = node("tree-detail", "Column")
                .style(Map.of("padding", "p-4", "gap", "gap-2", "borderWidth", "border", "borderColor", BORDER_COLOR, "borderRadius", "{primitives.radius.md}"))
                .children(List.of(
                        node("tree-detail-title", "Text")
                                .props(Map.of("value", Map.of("$bind", "state.selectedKey")))
                                .style(Map.of("fontSize", "text-lg", "fontWeight", 600))
                                .build(),
                        node("tree-detail-placeholder", "Text")
                                .props(Map.of("value", "id".equals(lang) ? "Pilih node untuk melihat detail" : "Select a node to view details"))
                                .style(Map.of("color", "{primitives.color.text-secondary}", "fontSize", "text-sm"))
                                .build()
                ))
                .build();

        var treePane = node("tree-pane", "Container")
                .style(Map.of("width", "w-1/3", "borderWidth", "border", "borderColor", BORDER_COLOR, "borderRadius", "{primitives.radius.md}"))
                .children(List.of(treeViewNode))
                .build();

        var detailPane = node("detail-pane", "Container")
                .style(Map.of("width", "w-2/3"))
                .children(List.of(detailPanel))
                .build();

        var layoutRow = node("tree-layout", "Row")
                .style(Map.of("display", "flex", "gap", "gap-4", "padding", "p-4"))
                .children(List.of(treePane, detailPane))
                .build();

        var toolbar = node("tree-toolbar", "Toolbar")
                .style(Map.of("display", "flex", "gap", "gap-3", "padding", "p-4", "borderWidth", "border-b", "borderColor", BORDER_COLOR))
                .children(List.of(searchNode))
                .build();

        var header = pageHeader(title, List.of(createButton));

        var pageRoot = node("page", "Column")
                .style(Map.of("fontSize", "text-base", "width", "w-full"))
                .children(List.of(header, toolbar, layoutRow))
                .build();

        return new UidlDocument(
                UidlDocument.SPEC_VERSION,
                docId,
                title,
                "/app/tree/" + meta.name(),
                null,
                state,
                Map.of("nodes", treeItems),
                null,
                pageRoot
        );
    }

    private static Map<String, Object> toTreeItem(TreeNode node, String lang) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", node.key());
        String labelStr = "id".equals(lang) && node.label().id() != null
                ? node.label().id()
                : (node.label().en() != null ? node.label().en() : node.key());
        map.put("label", labelStr);
        if (node.children() != null && !node.children().isEmpty()) {
            map.put("children", node.children().stream().map(c -> toTreeItem(c, lang)).toList());
        }
        return map;
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

        var titleNode = node("tree-header-title", "Text")
                .props(Map.of("value", title, "heading", 1))
                .style(Map.of("fontSize", "text-xl", "fontWeight", 600))
                .build();

        var actionsNode = node("tree-header-actions", "Toolbar")
                .style(Map.of("display", "flex", "gap", "gap-2"))
                .children(actions)
                .build();

        return node("tree-header", "Navbar")
                .style(style)
                .children(List.of(titleNode, actionsNode))
                .build();
    }

    private static Map<String, Object> changeEvent(String path) {
        var map = new LinkedHashMap<String, Object>();
        var setState = new LinkedHashMap<String, Object>();
        setState.put("path", path);
        setState.put("value", null);
        map.put("onChange", List.of(Collections.singletonMap("setState", setState)));
        return map;
    }
}
