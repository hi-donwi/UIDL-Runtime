package dev.uidl.generator.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * The seven page recipes the compiler supports.
 * Each recipe takes a recipe-specific meta object and produces a UidlDocument.
 */
public enum PageRecipe {

    LIST("list"),
    FORM("form"),
    REPORT("report"),
    DASHBOARD("dashboard"),
    SETTINGS("settings"),
    TREE("tree"),
    WIZARD("wizard");

    private final String value;

    PageRecipe(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static PageRecipe fromValue(String value) {
        for (PageRecipe recipe : values()) {
            if (recipe.value.equals(value)) {
                return recipe;
            }
        }
        throw new IllegalArgumentException("Unknown page recipe: " + value);
    }
}
