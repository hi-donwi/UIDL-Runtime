package dev.uidl.generator.conformance;

import java.util.Arrays;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Theme token resolution for the generator's conformance harness.
 *
 * <p>The Java generator has no runtime theme consumer — it <em>emits</em> token
 * references ({@code {primitives.color.border}} …) into compiled documents — so this
 * resolver lives in test scope and backs two checks: the shared theme-class
 * conformance cases, and that every token ref the production compilers emit resolves
 * in every shipped theme. Semantics mirror {@code packages/core/src/theme/engine.ts}
 * (and the Android/Flutter resolvers) exactly: dotted key parts join with "-", semantic
 * holders stay opaque, unknown token spaces resolve to null.
 */
final class ThemeTokens {

    /** Categories that map to CSS custom properties; mirrors CSS_VAR_CATEGORIES. */
    private static final Set<String> CSS_VAR_CATEGORIES =
            Set.of("color", "spacing", "radius", "shadow", "font", "border");

    private static final Set<String> SEMANTIC_CATEGORIES =
            Set.of("color", "spacing", "radius", "shadow", "typography");

    private final JsonNode primitives;
    private final JsonNode semantics;

    private ThemeTokens(JsonNode primitives, JsonNode semantics) {
        this.primitives = primitives;
        this.semantics = semantics;
    }

    /** Parses a decoded theme JSON object ({@code {primitives: {...}, semantics: {...}}}). */
    static ThemeTokens parse(JsonNode raw) {
        return new ThemeTokens(raw.path("primitives"), raw.path("semantics"));
    }

    /**
     * Turns a braced token reference into its CSS custom property:
     * {@code {primitives.color.primary}} → {@code var(--color-primary)}. Dots after the
     * category join with "-", so {@code {primitives.border.width.thin}} hits
     * {@code --border-width-thin} too. Returns null for anything that is not a braced
     * primitives reference.
     */
    static String tokenRefToCssVar(String ref) {
        if (!ref.startsWith("{") || !ref.endsWith("}")) {
            return null;
        }
        String[] parts = ref.substring(1, ref.length() - 1).split("\\.");
        if (parts.length < 3 || !"primitives".equals(parts[0])) {
            return null;
        }
        if (!CSS_VAR_CATEGORIES.contains(parts[1])) {
            return null;
        }
        return "var(--" + parts[1] + "-" + String.join("-", Arrays.copyOfRange(parts, 2, parts.length)) + ")";
    }

    /**
     * Resolves a bare token path to its theme value without dereferencing nested
     * {@code {...}} refs (semantic holders stay opaque). Returns null for paths outside
     * the primitives/semantics token spaces or for unknown categories.
     */
    JsonNode resolveToken(String path) {
        String[] parts = path.split("\\.");
        JsonNode groups;
        switch (parts[0]) {
            case "primitives" -> groups = primitives;
            case "semantics" -> groups = semantics;
            default -> {
                return null;
            }
        }
        if (parts.length < 2) {
            return null;
        }
        String category = parts[1];
        Set<String> known = "primitives".equals(parts[0]) ? CSS_VAR_CATEGORIES : SEMANTIC_CATEGORIES;
        if (!known.contains(category)) {
            return null;
        }
        // Dotted key parts join with "-" to match tokenRefToCssVar, so
        // `primitives.border.width.thin` and `primitives.border.width-thin` hit one key.
        String key = String.join("-", Arrays.copyOfRange(parts, 2, parts.length));
        JsonNode value = groups.path(category).path(key);
        return value.isMissingNode() ? null : value;
    }
}
