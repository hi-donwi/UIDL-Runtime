package dev.uidl.generator.model;

import java.util.List;

/** A section in a settings page. */
public record SettingsSection(String id, LocalizedText label, List<SettingsField> fields) {

    public SettingsSection {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("SettingsSection.id must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("SettingsSection.label must not be null");
        }
        if (fields == null || fields.isEmpty()) {
            throw new IllegalArgumentException("SettingsSection.fields must not be empty");
        }
    }
}
