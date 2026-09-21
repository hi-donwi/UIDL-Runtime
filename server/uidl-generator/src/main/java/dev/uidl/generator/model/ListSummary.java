package dev.uidl.generator.model;

/** An aggregate summary row in a list view (e.g. sum of a column). */
public record ListSummary(LocalizedText label, String agg, String field) {

    public ListSummary {
        if (label == null) {
            throw new IllegalArgumentException("ListSummary.label must not be null");
        }
        if (agg == null || agg.isBlank()) {
            throw new IllegalArgumentException("ListSummary.agg must not be blank");
        }
        if (field == null || field.isBlank()) {
            throw new IllegalArgumentException("ListSummary.field must not be blank");
        }
    }
}
