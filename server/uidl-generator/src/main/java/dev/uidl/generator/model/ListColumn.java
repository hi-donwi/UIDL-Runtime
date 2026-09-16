package dev.uidl.generator.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A column in a list view. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ListColumn(String field, String width, String align) {

    public ListColumn {
        if (field == null || field.isBlank()) {
            throw new IllegalArgumentException("ListColumn.field must not be blank");
        }
    }

    public ListColumn(String field) {
        this(field, null, null);
    }
}
