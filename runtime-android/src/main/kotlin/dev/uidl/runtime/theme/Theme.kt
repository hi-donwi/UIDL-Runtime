package dev.uidl.runtime.theme

/**
 * A UIDL theme: named primitive and semantic token groups a document may reference.
 *
 * Token data ships as JSON (conformance/themes/, generated from the reference runtime's
 * presets by `pnpm export:themes`); [fromMap] parses that shape. The runtime stays
 * data-agnostic — an app may supply a theme from assets, the network, or the bundled
 * export — and resolves tokens with [ThemeResolver].
 */
data class Theme(
    /** Primitive token groups by category, e.g. primitives["color"]["surface-container"]. */
    val primitives: Map<String, Map<String, Any?>>,
    /** Semantic token groups by category; typography values are maps, the rest strings. */
    val semantics: Map<String, Map<String, Any?>>,
) {
    companion object {
        /** Parses a decoded theme JSON object (`{primitives: {...}, semantics: {...}}`). */
        fun fromMap(raw: Map<String, Any?>): Theme =
            Theme(
                primitives = tokenGroups(raw["primitives"]),
                semantics = tokenGroups(raw["semantics"]),
            )

        @Suppress("UNCHECKED_CAST")
        private fun tokenGroups(raw: Any?): Map<String, Map<String, Any?>> =
            (raw as? Map<String, Any?>)
                ?.mapNotNull { (category, value) ->
                    val group = value as? Map<String, Any?> ?: return@mapNotNull null
                    category to group
                }
                ?.toMap()
                ?: emptyMap()
    }
}
