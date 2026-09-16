package dev.uidl.generator.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A headline summary figure for a report (e.g. "Total: Rp 1.500.000"). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportSummary(
        LocalizedText label,
        String agg,
        String field,
        Object value,
        String format
) {

    public ReportSummary {
        if (label == null) {
            throw new IllegalArgumentException("ReportSummary.label must not be null");
        }
    }

    public ReportSummary(LocalizedText label, String agg, String field, String format) {
        this(label, agg, field, null, format);
    }

    public ReportSummary(LocalizedText label, Object value) {
        this(label, null, null, value, null);
    }
}
