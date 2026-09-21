package dev.uidl.generator.uidl;

import java.util.Map;

/**
 * Helper for building UIDL nodes with a fluent API.
 * Mutable builder — call {@link #build()} to get the immutable {@link UidlNode}.
 */
public final class UidlNodeBuilder {

    private final String id;
    private final String type;
    private String name;
    private Map<String, Object> props;
    private Map<String, Object> style;
    private java.util.List<UidlNode> children;
    private Map<String, java.util.List<UidlNode>> slots;
    private Map<String, Object> bindings;
    private Map<String, Object> events;
    private Map<String, Object> visibility;
    private Map<String, Object> repeat;
    private String componentId;
    private String testId;

    public UidlNodeBuilder(String id, String type) {
        this.id = id;
        this.type = type;
    }

    public static UidlNodeBuilder node(String id, String type) {
        return new UidlNodeBuilder(id, type);
    }

    public UidlNodeBuilder name(String name) {
        this.name = name;
        return this;
    }

    public UidlNodeBuilder props(Map<String, Object> props) {
        this.props = props;
        return this;
    }

    public UidlNodeBuilder style(Map<String, Object> style) {
        this.style = style;
        return this;
    }

    public UidlNodeBuilder children(java.util.List<UidlNode> children) {
        this.children = children;
        return this;
    }

    public UidlNodeBuilder children(UidlNode... children) {
        this.children = java.util.List.of(children);
        return this;
    }

    public UidlNodeBuilder slots(Map<String, java.util.List<UidlNode>> slots) {
        this.slots = slots;
        return this;
    }

    public UidlNodeBuilder bindings(Map<String, Object> bindings) {
        this.bindings = bindings;
        return this;
    }

    public UidlNodeBuilder events(Map<String, Object> events) {
        this.events = events;
        return this;
    }

    public UidlNodeBuilder visibility(Map<String, Object> visibility) {
        this.visibility = visibility;
        return this;
    }

    public UidlNodeBuilder repeat(Map<String, Object> repeat) {
        this.repeat = repeat;
        return this;
    }

    public UidlNodeBuilder componentId(String componentId) {
        this.componentId = componentId;
        return this;
    }

    public UidlNodeBuilder testId(String testId) {
        this.testId = testId;
        return this;
    }

    public UidlNode build() {
        return new UidlNode(id, type, name, props, style, children, slots,
                bindings, events, visibility, repeat, componentId, testId);
    }
}
