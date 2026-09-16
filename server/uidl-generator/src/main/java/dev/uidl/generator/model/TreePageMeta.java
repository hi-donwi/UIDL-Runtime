package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Metadata for a tree page recipe.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TreePageMeta(
        String name,
        LocalizedText label,
        String titleField,
        List<FieldMeta> fields,
        List<TreeNode> nodes,
        String parentField
) {

    public TreePageMeta {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("TreePageMeta.name must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("TreePageMeta.label must not be null");
        }
        if (titleField == null || titleField.isBlank()) {
            throw new IllegalArgumentException("TreePageMeta.titleField must not be blank");
        }
        if (fields == null || fields.isEmpty()) {
            throw new IllegalArgumentException("TreePageMeta.fields must not be empty");
        }
        if (nodes == null || nodes.isEmpty()) {
            throw new IllegalArgumentException("TreePageMeta.nodes must not be empty");
        }
    }
}
