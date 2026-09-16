package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A filter control in a list view toolbar. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ListFilter(
        String field,
        String widget,
        LocalizedText label,
        List<FieldOption> options
) {

    public ListFilter {
        if (field == null || field.isBlank()) {
            throw new IllegalArgumentException("ListFilter.field must not be blank");
        }
        if (widget == null || widget.isBlank()) {
            throw new IllegalArgumentException("ListFilter.widget must not be blank");
        }
    }
}
