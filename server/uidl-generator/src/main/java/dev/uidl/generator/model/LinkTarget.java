package dev.uidl.generator.model;

/**
 * A Link field's lookup target: which doctype to query and which keys to use
 * for the value/label of each option row.
 */
public record LinkTarget(String doctype, String valueKey, String labelKey) {

    public LinkTarget {
        if (doctype == null || doctype.isBlank()) {
            throw new IllegalArgumentException("LinkTarget.doctype must not be blank");
        }
    }

    public LinkTarget(String doctype) {
        this(doctype, null, null);
    }
}
