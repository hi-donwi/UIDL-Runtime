package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A state transition in a document workflow (e.g. Draft → Submitted). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record StateTransition(
        String name,
        LocalizedText label,
        List<String> from,
        String to,
        LocalizedText confirm
) {

    public StateTransition {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("StateTransition.name must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("StateTransition.label must not be null");
        }
        if (from == null || from.isEmpty()) {
            throw new IllegalArgumentException("StateTransition.from must not be empty");
        }
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("StateTransition.to must not be blank");
        }
    }

    public StateTransition(String name, LocalizedText label, List<String> from, String to) {
        this(name, label, from, to, null);
    }
}
