package dev.uidl.generator.model;

/** Reference to a child table inside a form (e.g. "Purchase Order Items"). */
public record ChildTableRef(String field, String doctype) {

    public ChildTableRef {
        if (field == null || field.isBlank()) {
            throw new IllegalArgumentException("ChildTableRef.field must not be blank");
        }
        if (doctype == null || doctype.isBlank()) {
            throw new IllegalArgumentException("ChildTableRef.doctype must not be blank");
        }
    }
}
