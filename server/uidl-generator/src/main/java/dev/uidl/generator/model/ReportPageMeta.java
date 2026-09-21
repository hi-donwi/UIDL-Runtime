package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Metadata for a report page recipe: columns, data source, optional filters and summaries.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportPageMeta(
        String name,
        LocalizedText label,
        List<ReportColumn> columns,
        Object dataSource,
        List<ReportFilter> filters,
        List<ReportSummary> summaries
) {

    public ReportPageMeta {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("ReportPageMeta.name must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("ReportPageMeta.label must not be null");
        }
        if (columns == null || columns.isEmpty()) {
            throw new IllegalArgumentException("ReportPageMeta.columns must not be empty");
        }
        if (dataSource == null) {
            throw new IllegalArgumentException("ReportPageMeta.dataSource must not be null");
        }
    }
}
