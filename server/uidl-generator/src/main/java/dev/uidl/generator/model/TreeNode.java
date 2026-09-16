package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A node in a tree structure. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TreeNode(String key, LocalizedText label, List<TreeNode> children) {

    public TreeNode {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("TreeNode.key must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("TreeNode.label must not be null");
        }
    }
}
