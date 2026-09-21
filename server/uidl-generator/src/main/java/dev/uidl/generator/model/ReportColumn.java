package dev.uidl.generator.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A column in a report table. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportColumn(
        String key,
        String label,
        String align,
        String width,
        CellFormat format
) {

    public ReportColumn {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("ReportColumn.key must not be blank");
        }
        if (label == null || label.isBlank()) {
            throw new IllegalArgumentException("ReportColumn.label must not be blank");
        }
    }
}
