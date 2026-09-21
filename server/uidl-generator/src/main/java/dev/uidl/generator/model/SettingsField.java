package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/** A field in a settings page, optionally grouped. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SettingsField(
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
        String section,
        String group
) {

    public SettingsField {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("SettingsField.key must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("SettingsField.label must not be null");
        }
        if (widget == null) {
            throw new IllegalArgumentException("SettingsField.widget must not be null");
        }
    }
}
