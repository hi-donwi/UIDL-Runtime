package dev.uidl.generator.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * How a cell value is formatted for display.
 * Matches the TypeScript {@code CellFormat} from {@code utils/listCell.ts}.
 */
public enum CellFormat {

    TEXT("text"),
    NUMBER("number"),
    CURRENCY("currency"),
    PERCENT("percent"),
    DATE("date"),
    DATETIME("datetime"),
    BOOLEAN("boolean"),
    STATUS("status"),
    LINK("link");

    private final String value;

    CellFormat(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static CellFormat fromValue(String value) {
        for (CellFormat f : values()) {
            if (f.value.equals(value)) {
                return f;
            }
        }
        throw new IllegalArgumentException("Unknown cell format: " + value);
    }
}
