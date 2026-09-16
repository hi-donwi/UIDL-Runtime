package dev.uidl.runtime.model

import dev.uidl.runtime.spec.UidlErrorCodes
import dev.uidl.runtime.spec.UidlException

data class UidlDocument(
    val version: String = "1.0",
    val id: String = "untitled",
    val name: String = "Untitled Document",
    val root: UidlNode,
    val initialState: Map<String, Any?> = emptyMap(),
    val dataSources: Map<String, Any?> = emptyMap(),
    val components: Map<String, UidlNode> = emptyMap(),
    val theme: Map<String, Any?>? = null,
    val metadata: Map<String, Any?>? = null
) {
    companion object {
        @Suppress("UNCHECKED_CAST")
        fun fromMap(map: Map<String, Any?>): UidlDocument {
            val rootObj = map["root"]
            if (rootObj !is Map<*, *>) {
                throw UidlException(
                    code = UidlErrorCodes.INVALID_DOCUMENT,
                    message = "Missing or invalid 'root' node in UIDL document"
                )
            }

            val parsedRoot = UidlNode.fromMap(rootObj as Map<String, Any?>)
            if (parsedRoot.id.isBlank() || parsedRoot.type.isBlank()) {
                throw UidlException(
                    code = UidlErrorCodes.INVALID_NODE,
                    message = "Root node must specify non-blank 'id' and 'type'"
                )
            }

            val rawComponents = map["components"] as? Map<String, *>
            val parsedComponents = mutableMapOf<String, UidlNode>()
            rawComponents?.forEach { (key, value) ->
                if (value is Map<*, *>) {
                    parsedComponents[key] = UidlNode.fromMap(value as Map<String, Any?>)
                }
            }

            return UidlDocument(
                version = (map["version"] as? String) ?: "1.0",
                id = (map["id"] as? String) ?: "untitled",
                name = (map["name"] as? String) ?: "Untitled Document",
                root = parsedRoot,
                initialState = (map["initialState"] as? Map<String, Any?>) ?: emptyMap(),
                dataSources = (map["dataSources"] as? Map<String, Any?>) ?: emptyMap(),
                components = parsedComponents,
                theme = map["theme"] as? Map<String, Any?>,
                metadata = map["metadata"] as? Map<String, Any?>
            )
        }
    }
}
