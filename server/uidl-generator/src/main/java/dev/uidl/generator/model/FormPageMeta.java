package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Metadata for a form page recipe: the doctype to edit, fields, optional state machine,
 * and child tables.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FormPageMeta(
        String name,
        LocalizedText label,
        String titleField,
        List<FieldMeta> fields,
        DocumentStates states,
        List<ChildTableRef> childTables
) {

    public FormPageMeta {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("FormPageMeta.name must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("FormPageMeta.label must not be null");
        }
        if (titleField == null || titleField.isBlank()) {
            throw new IllegalArgumentException("FormPageMeta.titleField must not be blank");
        }
        if (fields == null || fields.isEmpty()) {
            throw new IllegalArgumentException("FormPageMeta.fields must not be empty");
        }
    }
}
