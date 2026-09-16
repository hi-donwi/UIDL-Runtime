package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A filter control in a report toolbar. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportFilter(
        String field,
        LocalizedText label,
        String widget,
        List<FieldOption> options,
        Object defaultValue
) {

    public ReportFilter {
        if (field == null || field.isBlank()) {
            throw new IllegalArgumentException("ReportFilter.field must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("ReportFilter.label must not be null");
        }
        if (widget == null || widget.isBlank()) {
            throw new IllegalArgumentException("ReportFilter.widget must not be blank");
        }
    }
}
