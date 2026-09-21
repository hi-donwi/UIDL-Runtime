package dev.uidl.runtime.compose

import dev.uidl.runtime.model.UidlNode

/**
 * Render context holding runtime state, scope, and callbacks during UI rendering.
 */
data class UidlRenderContext(
    val state: Map<String, Any?>,
    val scope: Map<String, Any?>,
    val onEvent: (nodeId: String, eventName: String, payload: Any?) -> Unit
)

/**
 * Interface representing a platform widget renderer.
 * On Android, this will be implemented by Jetpack Compose @Composable functions.
 */
fun interface UidlWidgetRenderer<T> {
    fun render(node: UidlNode, context: UidlRenderContext): T
}

/**
 * Registry mapping UIDL node types (e.g. "Screen", "Container", "Text", "Button", "List")
 * to platform widget renderers.
 */
class UidlComponentRegistry<T> {
    private val renderers = mutableMapOf<String, UidlWidgetRenderer<T>>()

    fun register(type: String, renderer: UidlWidgetRenderer<T>) {
        renderers[type] = renderer
    }

    fun get(type: String): UidlWidgetRenderer<T>? = renderers[type]

    fun has(type: String): Boolean = renderers.containsKey(type)

    fun registeredTypes(): Set<String> = renderers.keys.toSet()
}
