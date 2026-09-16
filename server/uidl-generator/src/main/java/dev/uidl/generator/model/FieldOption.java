package dev.uidl.generator.model;

/**
 * A selectable option for Select, RadioGroup, or similar widgets.
 */
public record FieldOption(String value, String label) {

    public FieldOption {
        if (value == null) {
            throw new IllegalArgumentException("FieldOption.value must not be null");
        }
        if (label == null) {
            throw new IllegalArgumentException("FieldOption.label must not be null");
        }
    }
}
