package dev.uidl.generator.model;

/** Default sort direction for a list or report. */
public record SortSpec(String field, String dir) {

    public SortSpec {
        if (field == null || field.isBlank()) {
            throw new IllegalArgumentException("SortSpec.field must not be blank");
        }
        if (dir == null || (!dir.equals("asc") && !dir.equals("desc"))) {
            throw new IllegalArgumentException("SortSpec.dir must be 'asc' or 'desc'");
        }
    }
}
