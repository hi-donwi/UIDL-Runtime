package dev.uidl.generator.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Metadata for a wizard page recipe.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record WizardPageMeta(
        String name,
        LocalizedText label,
        List<WizardStep> steps
) {

    public WizardPageMeta {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("WizardPageMeta.name must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("WizardPageMeta.label must not be null");
        }
        if (steps == null || steps.isEmpty()) {
            throw new IllegalArgumentException("WizardPageMeta.steps must not be empty");
        }
    }
}
