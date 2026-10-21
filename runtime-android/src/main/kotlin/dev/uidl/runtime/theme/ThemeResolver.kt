package dev.uidl.runtime.theme

/**
 * Cross-platform theme token resolution, mirroring the reference runtime's theme engine
 * (packages/core/src/theme/engine.ts). Conformance cases assert this behaviour, so the
 * rules here must not drift from the TypeScript implementation.
 */
object ThemeResolver {

    /** Categories that map to CSS custom properties; mirrors CSS_VAR_CATEGORIES in engine.ts. */
    private val cssVarCategories = setOf("color", "spacing", "radius", "shadow", "font", "border")

    private val primitiveCategories = cssVarCategories

    private val semanticCategories = setOf("color", "spacing", "radius", "shadow", "typography")

    /**
     * Turns a braced token reference into its CSS custom property:
     * `{primitives.color.primary}` → `var(--color-primary)`. Dots after the category join
     * with "-", so `{primitives.border.width.thin}` hits `--border-width-thin` too.
     * Returns null for anything that is not a braced primitives reference.
     */
    fun tokenRefToCssVar(ref: String): String? {
        if (!ref.startsWith("{") || !ref.endsWith("}")) return null
        val parts = ref.substring(1, ref.length - 1).split(".")
        if (parts.size < 3 || parts[0] != "primitives") return null
        val category = parts[1]
        if (category !in cssVarCategories) return null
        return "var(--$category-${parts.drop(2).joinToString("-")})"
    }

    /**
     * Resolves a bare token path to its theme value without dereferencing nested `{...}`
     * refs (semantic holders stay opaque, matching the reference runtime). Returns null
     * for paths outside the primitives/semantics token spaces or unknown categories.
     */
    fun resolveToken(theme: Theme, path: String): Any? {
        val parts = path.split(".")
        val groups = when (parts.firstOrNull()) {
            "primitives" -> theme.primitives
            "semantics" -> theme.semantics
            else -> return null
        }
        val category = parts.getOrNull(1) ?: return null
        val known = if (parts[0] == "primitives") primitiveCategories else semanticCategories
        if (category !in known) return null
        // Dotted key parts join with "-" to match tokenRefToCssVar, so
        // `primitives.border.width.thin` and `primitives.border.width-thin` hit one key.
        val key = parts.drop(2).joinToString("-")
        return groups[category]?.get(key)
    }
}
