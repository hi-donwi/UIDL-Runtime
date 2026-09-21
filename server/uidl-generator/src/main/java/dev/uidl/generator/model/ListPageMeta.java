package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Metadata for a list page recipe: the doctype to query, which columns to show,
 * filters, sort order, and optional summaries.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ListPageMeta(
        String name,
        LocalizedText label,
        String titleField,
        List<FieldMeta> fields,
        List<ListColumn> columns,
        List<ListFilter> filters,
        SortSpec defaultSort,
        Integer pageSize,
        String statusField,
        List<ListSummary> summaries
) {

    public ListPageMeta {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("ListPageMeta.name must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("ListPageMeta.label must not be null");
        }
        if (titleField == null || titleField.isBlank()) {
            throw new IllegalArgumentException("ListPageMeta.titleField must not be blank");
        }
        if (fields == null || fields.isEmpty()) {
            throw new IllegalArgumentException("ListPageMeta.fields must not be empty");
        }
        if (columns == null || columns.isEmpty()) {
            throw new IllegalArgumentException("ListPageMeta.columns must not be empty");
        }
        if (defaultSort == null) {
            throw new IllegalArgumentException("ListPageMeta.defaultSort must not be null");
        }
    }
}
