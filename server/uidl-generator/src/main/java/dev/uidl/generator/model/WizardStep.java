package dev.uidl.generator.model;

import java.util.List;

/** A step in a wizard workflow. */
public record WizardStep(String id, LocalizedText label, List<FieldMeta> fields) {

    public WizardStep {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("WizardStep.id must not be blank");
        }
        if (label == null) {
            throw new IllegalArgumentException("WizardStep.label must not be null");
        }
        if (fields == null || fields.isEmpty()) {
            throw new IllegalArgumentException("WizardStep.fields must not be empty");
        }
    }
}
