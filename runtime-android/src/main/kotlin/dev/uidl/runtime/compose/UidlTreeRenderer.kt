package dev.uidl.runtime.compose

import dev.uidl.runtime.actions.ActionDispatcher
import dev.uidl.runtime.evaluator.ExpressionEvaluator
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

/**
 * Stateful view of one document: render the tree, then dispatch node events
 * (for example Button `onClick`) through [ActionDispatcher].
 */
class UidlDocumentSession(private val document: UidlDocument) {
    private val state: MutableMap<String, Any?> = document.initialState.toMutableMap()
    private val scope: MutableMap<String, Any?> = mutableMapOf(
        "state" to state,
        "data" to mutableMapOf<String, Any?>(),
        "session" to mutableMapOf<String, Any?>(),
        "route" to mutableMapOf<String, Any?>()
    )
    private val dispatcher = ActionDispatcher(state, scope)

    fun render(): UidlRenderedNode {
        val context = UidlRenderContext(
            state = state,
            scope = scope,
            onEvent = { nodeId, eventName, payload -> dispatch(nodeId, eventName, payload) }
        )
        return UidlTreeRenderer.render(document, context = context)
    }

    fun click(nodeId: String) {
        dispatch(nodeId, "onClick", null)
    }

    fun change(nodeId: String, value: Any?) {
        dispatch(nodeId, "onChange", value)
    }

    private fun dispatch(nodeId: String, eventName: String, payload: Any?) {
        val node = findNode(document.root, nodeId)
            ?: throw IllegalArgumentException("No node with id '$nodeId'")
        val action = node.events?.get(eventName)
            ?: throw IllegalArgumentException("Node '$nodeId' has no '$eventName' handler")
        dispatcher.execute(action, payload)
    }

    private fun findNode(node: UidlNode, id: String): UidlNode? {
        if (node.id == id) return node
        for (child in node.children) {
            findNode(child, id)?.let { return it }
        }
        return null
    }
}

object UidlTreeRenderer {
    fun defaultRegistry(): UidlComponentRegistry<UidlRenderedNode> {
        val registry = UidlComponentRegistry<UidlRenderedNode>()
        fun registerLayout(type: String) {
            registry.register(type) { node, context ->
                UidlRenderedNode(
                    id = node.id,
                    type = type,
                    props = node.props,
                    children = node.children.map { child -> renderNode(child, context, registry) }
                )
            }
        }
        registerLayout("Column")
        registerLayout("Row")
        registerLayout("Container")
        registry.register("Text") { node, _ ->
            UidlRenderedNode(
                id = node.id,
                type = "Text",
                props = node.props
            )
        }
        registry.register("Button") { node, _ ->
            UidlRenderedNode(
                id = node.id,
                type = "Button",
                props = node.props
            )
        }
        registry.register("TextField") { node, _ ->
            UidlRenderedNode(
                id = node.id,
                type = "TextField",
                props = node.props
            )
        }
        return registry
    }

    fun render(
        document: UidlDocument,
        registry: UidlComponentRegistry<UidlRenderedNode> = defaultRegistry(),
        context: UidlRenderContext? = null
    ): UidlRenderedNode {
        val ctx = context ?: UidlRenderContext(
            state = document.initialState,
            scope = mapOf("state" to document.initialState),
            onEvent = { _, _, _ -> }
        )
        return renderNode(document.root, ctx, registry)
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
        val resolved = node.copy(
            props = node.props.mapValues { (_, value) ->
                ExpressionEvaluator.evaluate(value, context.scope)
            }
        )
        return renderer.render(resolved, context)
    }
}
