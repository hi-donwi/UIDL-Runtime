package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Metadata for a settings page recipe.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SettingsPageMeta(
        String name,
        LocalizedText label,
        List<SettingsSection> sections
) {

    public SettingsPageMeta {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("SettingsPageMeta.name must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("SettingsPageMeta.label must not be null");
        }
        if (sections == null || sections.isEmpty()) {
            throw new IllegalArgumentException("SettingsPageMeta.sections must not be empty");
        }
    }
}
