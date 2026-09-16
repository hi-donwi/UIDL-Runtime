package dev.uidl.generator.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Widget type for a field. Serializes to PascalCase strings matching the UIDL spec.
 */
public enum FieldWidget {

    TEXT_FIELD("TextField"),
    TEXTAREA("Textarea"),
    SELECT("Select"),
    RADIO_GROUP("RadioGroup"),
    CHECKBOX("Checkbox"),
    SWITCH("Switch"),
    SLIDER("Slider"),
    LINK("Link"),
    CURRENCY("Currency"),
    DATE("Date"),
    TABLE("Table");

    private final String value;

    FieldWidget(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static FieldWidget fromValue(String value) {
        for (FieldWidget w : values()) {
            if (w.value.equals(value)) {
                return w;
            }
        }
        throw new IllegalArgumentException("Unknown field widget: " + value);
    }
}
