package dev.uidl.generator.model;

import java.util.List;

/**
 * Document state machine: which field holds the status, what values are valid,
 * what transitions are allowed.
 */
public record DocumentStates(
        String field,
        List<String> values,
        String initial,
        List<StateTransition> transitions
) {

    public DocumentStates {
        if (field == null || field.isBlank()) {
            throw new IllegalArgumentException("DocumentStates.field must not be blank");
        }
        if (values == null || values.isEmpty()) {
            throw new IllegalArgumentException("DocumentStates.values must not be empty");
        }
        if (initial == null || initial.isBlank()) {
            throw new IllegalArgumentException("DocumentStates.initial must not be blank");
        }
        if (transitions == null) {
            throw new IllegalArgumentException("DocumentStates.transitions must not be null");
        }
    }
}
