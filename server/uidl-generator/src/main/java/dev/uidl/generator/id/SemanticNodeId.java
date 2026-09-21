package dev.uidl.generator.id;

/**
 * Deterministic node ID generation. Same input → same ID across recompiles,
 * enabling incremental UIDL patching to preserve state and focus.
 *
 * <p>Port of {@code semanticNodeId()} and {@code semanticListNodeIds()} from
 * {@code compiler/types.ts}.
 */
public final class SemanticNodeId {

    private SemanticNodeId() {}

    /**
     * Deterministic node ID for a field/control derived only from recipe + meta identity.
     */
    public static String fieldId(String recipe, String metaName, String fieldKey) {
        return recipe + "-" + metaName + "-field-" + fieldKey;
    }

    /** Search box node ID for a list page. */
    public static String listSearch(String metaName) {
        return "list-" + metaName + "-search";
    }

    /** Table node ID for a list page. */
    public static String listTable(String metaName) {
        return "list-" + metaName + "-table";
    }

    /** Pagination node ID for a list page. */
    public static String listPage(String metaName) {
        return "list-" + metaName + "-page";
    }

    /** Root container node ID. */
    public static String root(String recipe, String metaName) {
        return recipe + "-" + metaName + "-root";
    }

    /** Toolbar container node ID. */
    public static String toolbar(String recipe, String metaName) {
        return recipe + "-" + metaName + "-toolbar";
    }

    /** Form section container node ID. */
    public static String section(String recipe, String metaName, String sectionId) {
        return recipe + "-" + metaName + "-section-" + sectionId;
    }

    /** Action button node ID. */
    public static String action(String recipe, String metaName, String actionName) {
        return recipe + "-" + metaName + "-action-" + actionName;
    }
}
