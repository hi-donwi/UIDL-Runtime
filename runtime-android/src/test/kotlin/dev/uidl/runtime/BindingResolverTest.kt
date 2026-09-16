package dev.uidl.runtime

import dev.uidl.runtime.binding.BindingResolver
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class BindingResolverTest {

    @Test
    fun `resolves nested state path`() {
        val scope = mapOf(
            "state" to mapOf(
                "user" to mapOf(
                    "name" to "Alice",
                    "role" to "Admin"
                )
            )
        )

        assertThat(BindingResolver.resolvePath("state.user.name", scope)).isEqualTo("Alice")
        assertThat(BindingResolver.resolvePath("state.user.role", scope)).isEqualTo("Admin")
        assertThat(BindingResolver.resolvePath("state.user.nonExistent", scope)).isNull()
    }

    @Test
    fun `resolves list indexing in path`() {
        val scope = mapOf(
            "data" to mapOf(
                "items" to listOf(
                    mapOf("id" to "item-1", "title" to "First"),
                    mapOf("id" to "item-2", "title" to "Second")
                )
            )
        )

        assertThat(BindingResolver.resolvePath("data.items.0.title", scope)).isEqualTo("First")
        assertThat(BindingResolver.resolvePath("data.items.1.id", scope)).isEqualTo("item-2")
        assertThat(BindingResolver.resolvePath("data.items.99.title", scope)).isNull()
    }

    @Test
    fun `resolves string template with multiple bindings`() {
        val scope = mapOf(
            "state" to mapOf(
                "firstName" to "John",
                "lastName" to "Doe"
            )
        )

        val template = "Hello \${state.firstName} \${state.lastName}!"
        val resolved = BindingResolver.resolveTemplate(template, scope)
        assertThat(resolved).isEqualTo("Hello John Doe!")
    }

    @Test
    fun `mutates map via setByPath`() {
        val state = mutableMapOf<String, Any?>()
        BindingResolver.setByPath(state, "filters.status", "active")
        BindingResolver.setByPath(state, "pagination.page", 1)

        @Suppress("UNCHECKED_CAST")
        val filters = state["filters"] as Map<String, Any?>
        assertThat(filters["status"]).isEqualTo("active")

        @Suppress("UNCHECKED_CAST")
        val pagination = state["pagination"] as Map<String, Any?>
        assertThat(pagination["page"]).isEqualTo(1)
    }
}
