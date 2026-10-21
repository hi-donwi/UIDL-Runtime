package dev.uidl.runtime

import dev.uidl.runtime.theme.Theme
import dev.uidl.runtime.theme.ThemeResolver
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ThemeResolverTest {

    private val theme = Theme.fromMap(
        mapOf(
            "primitives" to mapOf(
                "color" to mapOf(
                    "primary" to "#4B39EF",
                    "surface-container-low" to "#F6F8FB",
                ),
                "border" to mapOf(
                    "width-thin" to "1px",
                    "style-solid" to "solid",
                ),
                "elevation" to mapOf("low" to "0 1px 2px"),
            ),
            "semantics" to mapOf(
                "color" to mapOf("text-on-primary" to "{primitives.color.primary}"),
                "typography" to mapOf(
                    "headline-medium" to mapOf("fontSize" to "text-2xl", "fontWeight" to 600),
                ),
            ),
        ),
    )

    @Test
    fun `braced primitives ref becomes a css custom property`() {
        assertThat(ThemeResolver.tokenRefToCssVar("{primitives.color.primary}"))
            .isEqualTo("var(--color-primary)")
    }

    @Test
    fun `dotted key parts join with dashes`() {
        assertThat(ThemeResolver.tokenRefToCssVar("{primitives.border.width.thin}"))
            .isEqualTo("var(--border-width-thin)")
    }

    @Test
    fun `non primitives or malformed refs resolve to null`() {
        assertThat(ThemeResolver.tokenRefToCssVar("{semantics.color.text-on-primary}")).isNull()
        assertThat(ThemeResolver.tokenRefToCssVar("{primitives.elevation.low}")).isNull()
        assertThat(ThemeResolver.tokenRefToCssVar("{primitives.color}")).isNull()
        assertThat(ThemeResolver.tokenRefToCssVar("primitives.color.primary")).isNull()
    }

    @Test
    fun `bare paths resolve primitive and semantic values`() {
        assertThat(ThemeResolver.resolveToken(theme, "primitives.color.surface-container-low"))
            .isEqualTo("#F6F8FB")
        assertThat(ThemeResolver.resolveToken(theme, "primitives.border.width-thin"))
            .isEqualTo("1px")
        assertThat(ThemeResolver.resolveToken(theme, "primitives.border.width.thin"))
            .isEqualTo("1px")
    }

    @Test
    fun `semantic holders stay opaque token references`() {
        assertThat(ThemeResolver.resolveToken(theme, "semantics.color.text-on-primary"))
            .isEqualTo("{primitives.color.primary}")
    }

    @Test
    fun `typography tokens resolve as maps`() {
        assertThat(ThemeResolver.resolveToken(theme, "semantics.typography.headline-medium"))
            .isEqualTo(mapOf("fontSize" to "text-2xl", "fontWeight" to 600))
    }

    @Test
    fun `unknown token spaces and categories resolve to null`() {
        assertThat(ThemeResolver.resolveToken(theme, "components.button.primary")).isNull()
        assertThat(ThemeResolver.resolveToken(theme, "primitives.elevation.low")).isNull()
        assertThat(ThemeResolver.resolveToken(theme, "semantics.color")).isNull()
        assertThat(ThemeResolver.resolveToken(theme, "primitives")).isNull()
    }

    @Test
    fun `fromMap tolerates missing token groups`() {
        val empty = Theme.fromMap(emptyMap())
        assertThat(empty.primitives).isEmpty()
        assertThat(empty.semantics).isEmpty()
        assertThat(ThemeResolver.resolveToken(empty, "primitives.color.primary")).isNull()
    }
}
