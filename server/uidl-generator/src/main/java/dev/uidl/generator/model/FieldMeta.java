package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Metadata for a single field in a recipe. Used by form, list, settings, wizard, and tree recipes.
 *
 * <p>{@code options} can be either a {@code List<FieldOption>} (for Select/RadioGroup) or a
 * {@link LinkTarget} (for Link fields). The compiler inspects {@code widget} to decide which.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FieldMeta(
        String key,
        LocalizedText label,
        FieldWidget widget,
        CellFormat format,
        Boolean required,
        Boolean readOnly,
        List<FieldOption> options,
        LinkTarget linkTarget,
        String placeholder,
        Object defaultValue,
        String section
) {

    public FieldMeta {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("FieldMeta.key must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("FieldMeta.label must not be null");
        }
        if (widget == null) {
            throw new IllegalArgumentException("FieldMeta.widget must not be null");
        }
    }

    public FieldMeta(String key, LocalizedText label, FieldWidget widget) {
        this(key, label, widget, null, null, null, null, null, null, null, null);
    }

    public FieldMeta(String key, LocalizedText label, FieldWidget widget, Boolean required) {
        this(key, label, widget, null, required, null, null, null, null, null, null);
    }

    public FieldMeta(String key, LocalizedText label, FieldWidget widget, Boolean required,
                     CellFormat format, LinkTarget linkTarget, String placeholder, Object defaultValue, String section) {
        this(key, label, widget, format, required, null, null, linkTarget, placeholder, defaultValue, section);
    }
}
