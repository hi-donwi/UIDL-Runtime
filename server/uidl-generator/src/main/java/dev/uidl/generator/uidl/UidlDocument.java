package dev.uidl.generator.uidl;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The generated UIDL document: the output of a recipe compiler.
 * Matches {@code spec/schema/document.schema.json}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UidlDocument(
        String version,
        String id,
        String name,
        String route,
        Object theme,
        Map<String, Object> state,
        Map<String, Object> dataSources,
        Map<String, UidlNode> definitions,
        UidlNode root
) {

    /** Current spec version emitted by this generator. */
    public static final String SPEC_VERSION = "1.0";

    public UidlDocument {
        if (version == null || version.isBlank()) {
            throw new IllegalArgumentException("UidlDocument.version must not be blank");
        }
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("UidlDocument.id must not be blank");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("UidlDocument.name must not be blank");
        }
        if (root == null) {
            throw new IllegalArgumentException("UidlDocument.root must not be null");
        }
    }
}
