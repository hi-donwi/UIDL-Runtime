package dev.uidl.generator.model;

/**
 * Bilingual label: a machine-readable identifier and an English display text.
 * Matches the TypeScript {@code LocalizedText = { id: string; en: string }}.
 */
public record LocalizedText(String id, String en) {

    public LocalizedText {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("LocalizedText.id must not be blank");
        }
        if (en == null || en.isBlank()) {
            throw new IllegalArgumentException("LocalizedText.en must not be blank");
        }
    }
}
