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
    /** React `defaultWidgets` types. Native trees must register every name. */
    val CATALOG_WIDGET_TYPES: List<String> = listOf(
        "Container", "Row", "Column", "Stack", "Spacer", "Divider",
        "Text", "Icon", "Image", "Button", "Badge",
        "TextField", "Checkbox", "Switch", "Slider", "Select", "Textarea", "RadioGroup", "Form",
        "ListView", "GridView", "DataTable", "PageBar", "Chart", "KanbanBoard", "TreeView",
        "Sidebar", "Navbar", "Toolbar",
        "Drawer", "Panel", "Popover", "Dialog", "Snackbar",
        "QRCode", "Barcode", "DataMatrix"
    )

    private val LAYOUT_TYPES = setOf(
        "Container", "Row", "Column", "Stack", "Form",
        "ListView", "GridView", "DataTable", "PageBar", "Chart", "KanbanBoard", "TreeView",
        "Sidebar", "Navbar", "Toolbar",
        "Drawer", "Panel", "Popover", "Dialog", "Snackbar"
    )

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
        fun registerLeaf(type: String) {
            registry.register(type) { node, _ ->
                UidlRenderedNode(
                    id = node.id,
                    type = type,
                    props = node.props
                )
            }
        }
        for (type in CATALOG_WIDGET_TYPES) {
            if (type in LAYOUT_TYPES) registerLayout(type) else registerLeaf(type)
        }

        fun text(id: String, value: String) =
            UidlRenderedNode(id = id, type = "Text", props = mapOf("value" to value))

        fun mapsOf(value: Any?): List<Map<*, *>> {
            val list = value as? List<*> ?: return emptyList()
            return list.filterIsInstance<Map<*, *>>()
        }

        registry.register("DataTable") { node, _ ->
            val columns = mapsOf(node.props["columns"])
            val rows = mapsOf(node.props["rows"])
            val texts = mutableListOf<UidlRenderedNode>()
            columns.forEachIndexed { i, column ->
                val label = column["label"]?.toString() ?: column["key"]?.toString() ?: ""
                texts.add(text("${node.id}-col-$i", label))
            }
            rows.forEachIndexed { r, row ->
                columns.forEachIndexed { c, column ->
                    val key = column["key"]
                    texts.add(text("${node.id}-cell-$r-$c", "${row[key] ?: ""}"))
                }
            }
            UidlRenderedNode(id = node.id, type = "DataTable", props = node.props, children = texts)
        }

        registry.register("Chart") { node, _ ->
            val xKey = node.props["xKey"]?.toString() ?: "x"
            val rows = mapsOf(node.props["rows"])
            val texts = mutableListOf<UidlRenderedNode>()
            node.props["title"]?.toString()?.takeIf { it.isNotEmpty() }?.let {
                texts.add(text("${node.id}-title", it))
            }
            rows.forEachIndexed { i, row ->
                texts.add(text("${node.id}-x-$i", row[xKey]?.toString() ?: ""))
            }
            UidlRenderedNode(id = node.id, type = "Chart", props = node.props, children = texts)
        }

        registry.register("Dialog") { node, context ->
            if (node.props["open"] == false) {
                return@register UidlRenderedNode(id = node.id, type = "Dialog", props = node.props)
            }
            val texts = mutableListOf<UidlRenderedNode>()
            node.props["title"]?.toString()?.takeIf { it.isNotEmpty() }?.let {
                texts.add(text("${node.id}-title", it))
            }
            node.props["content"]?.toString()?.takeIf { it.isNotEmpty() }?.let {
                texts.add(text("${node.id}-content", it))
            }
            texts.addAll(node.children.map { child -> renderNode(child, context, registry) })
            UidlRenderedNode(id = node.id, type = "Dialog", props = node.props, children = texts)
        }

        registry.register("KanbanBoard") { node, _ ->
            val columns = mapsOf(node.props["columns"])
            val rows = mapsOf(node.props["rows"])
            val texts = mutableListOf<UidlRenderedNode>()
            node.props["title"]?.toString()?.takeIf { it.isNotEmpty() }?.let {
                texts.add(text("${node.id}-title", it))
            }
            columns.forEachIndexed { i, column ->
                texts.add(text("${node.id}-col-$i", column["title"]?.toString() ?: column["id"]?.toString() ?: ""))
                rows.filter { it["columnId"] == column["id"] }.forEachIndexed { j, card ->
                    texts.add(text("${node.id}-card-$i-$j", card["title"]?.toString() ?: card["label"]?.toString() ?: ""))
                }
            }
            UidlRenderedNode(id = node.id, type = "KanbanBoard", props = node.props, children = texts)
        }

        registry.register("TreeView") { node, _ ->
            val items = mapsOf(node.props["items"]).ifEmpty { mapsOf(node.props["rows"]) }
            val texts = mutableListOf<UidlRenderedNode>()
            node.props["title"]?.toString()?.takeIf { it.isNotEmpty() }?.let {
                texts.add(text("${node.id}-title", it))
            }
            fun walk(nodes: List<Map<*, *>>, prefix: String) {
                nodes.forEachIndexed { i, item ->
                    val label = item["title"]?.toString() ?: item["label"]?.toString() ?: item["id"]?.toString() ?: ""
                    texts.add(text("$prefix-$i", label))
                    walk(mapsOf(item["children"]), "$prefix-$i")
                }
            }
            walk(items, "${node.id}-n")
            UidlRenderedNode(id = node.id, type = "TreeView", props = node.props, children = texts)
        }

        fun registerCode(kind: String) {
            registry.register(kind) { node, _ ->
                val value = node.props["value"]?.toString() ?: ""
                val children = if (value.isEmpty()) emptyList() else listOf(text("${node.id}-value", value))
                UidlRenderedNode(id = node.id, type = kind, props = node.props, children = children)
            }
        }
        registerCode("QRCode")
        registerCode("Barcode")
        registerCode("DataMatrix")

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
