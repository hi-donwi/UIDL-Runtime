package dev.uidl.runtime.compose

import dev.uidl.runtime.model.UidlDocument
import dev.uidl.runtime.model.UidlNode
import dev.uidl.runtime.spec.UidlErrorCodes
import dev.uidl.runtime.spec.UidlException

/**
 * Host-agnostic render tree. The JVM test harness cannot depend on AndroidX Compose;
 * a Compose host maps these nodes onto `@Composable` functions.
 */
data class UidlRenderedNode(
    val id: String,
    val type: String,
    val props: Map<String, Any?> = emptyMap(),
    val children: List<UidlRenderedNode> = emptyList()
)

object UidlTreeRenderer {
    fun defaultRegistry(): UidlComponentRegistry<UidlRenderedNode> {
        val registry = UidlComponentRegistry<UidlRenderedNode>()
        registry.register("Column") { node, context ->
            UidlRenderedNode(
                id = node.id,
                type = "Column",
                props = node.props,
                children = node.children.map { child -> renderNode(child, context, registry) }
            )
        }
        registry.register("Text") { node, _ ->
            UidlRenderedNode(
                id = node.id,
                type = "Text",
                props = node.props
            )
        }
        return registry
    }

    fun render(
        document: UidlDocument,
        registry: UidlComponentRegistry<UidlRenderedNode> = defaultRegistry()
    ): UidlRenderedNode {
        val context = UidlRenderContext(
            state = document.initialState,
            scope = emptyMap(),
            onEvent = { _, _, _ -> }
        )
        return renderNode(document.root, context, registry)
    }

    fun renderNode(
        node: UidlNode,
        context: UidlRenderContext,
        registry: UidlComponentRegistry<UidlRenderedNode>
    ): UidlRenderedNode {
        val renderer = registry.get(node.type)
            ?: throw UidlException(
                code = UidlErrorCodes.UNKNOWN_COMPONENT,
                message = "No renderer registered for node type '${node.type}'"
            )
        return renderer.render(node, context)
    }
}
