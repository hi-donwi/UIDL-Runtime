package dev.uidl.generator.uidl;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * A node in the UIDL document tree. Matches {@code spec/schema/node.schema.json}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UidlNode(
        String id,
        String type,
        String name,
        Map<String, Object> props,
        Map<String, Object> style,
        List<UidlNode> children,
        Map<String, List<UidlNode>> slots,
        Map<String, Object> bindings,
        Map<String, Object> events,
        Map<String, Object> visibility,
        Map<String, Object> repeat,
        String componentId,
        String testId
) {

    public UidlNode {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("UidlNode.id must not be blank");
        }
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("UidlNode.type must not be blank");
        }
    }

    /**
     * Convenience builder for a node with only required fields.
     */
    public static UidlNode of(String id, String type) {
        return new UidlNode(id, type, null, null, null, null, null, null, null, null, null, null, null);
    }

    /**
     * Convenience builder for a node with children.
     */
    public static UidlNode withChildren(String id, String type, List<UidlNode> children) {
        return new UidlNode(id, type, null, null, null, children, null, null, null, null, null, null, null);
    }

    /**
     * Convenience builder for a node with props.
     */
    public static UidlNode withProps(String id, String type, Map<String, Object> props) {
        return new UidlNode(id, type, null, props, null, null, null, null, null, null, null, null, null);
    }
}
