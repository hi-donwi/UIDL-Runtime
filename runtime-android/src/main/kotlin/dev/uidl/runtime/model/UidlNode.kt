package dev.uidl.runtime.model

data class UidlVisibility(
    val condition: Any?
) {
    companion object {
        @Suppress("UNCHECKED_CAST")
        fun fromMap(map: Map<String, Any?>): UidlVisibility {
            return UidlVisibility(condition = map["condition"])
        }
    }
}

data class UidlRepeat(
    val dataSource: Any?,
    val asItem: String = "item",
    val indexKey: String? = null
) {
    companion object {
        @Suppress("UNCHECKED_CAST")
        fun fromMap(map: Map<String, Any?>): UidlRepeat {
            return UidlRepeat(
                dataSource = map["dataSource"],
                asItem = (map["as"] as? String) ?: "item",
                indexKey = map["index"] as? String
            )
        }
    }
}

data class UidlNode(
    val id: String,
    val type: String,
    val componentId: String? = null,
    val props: Map<String, Any?> = emptyMap(),
    val style: Map<String, Any?>? = null,
    val events: Map<String, Any?>? = null,
    val children: List<UidlNode> = emptyList(),
    val slots: Map<String, List<UidlNode>>? = null,
    val visibility: UidlVisibility? = null,
    val repeat: UidlRepeat? = null,
    val themeRef: String? = null,
    val testId: String? = null
) {
    companion object {
        @Suppress("UNCHECKED_CAST")
        fun fromMap(map: Map<String, Any?>): UidlNode {
            val id = (map["id"] as? String) ?: ""
            val type = (map["type"] as? String) ?: ""

            val rawChildren = map["children"] as? List<*>
            val parsedChildren = rawChildren?.mapNotNull { item ->
                (item as? Map<String, Any?>)?.let { fromMap(it) }
            } ?: emptyList()

            val rawSlots = map["slots"] as? Map<String, *>
            val parsedSlots = rawSlots?.mapValues { (_, slotChildren) ->
                (slotChildren as? List<*>)?.mapNotNull { item ->
                    (item as? Map<String, Any?>)?.let { fromMap(it) }
                } ?: emptyList()
            }

            val rawVisibility = map["visibility"] as? Map<String, Any?>
            val parsedVisibility = rawVisibility?.let { UidlVisibility.fromMap(it) }

            val rawRepeat = map["repeat"] as? Map<String, Any?>
            val parsedRepeat = rawRepeat?.let { UidlRepeat.fromMap(it) }

            return UidlNode(
                id = id,
                type = type,
                componentId = map["componentId"] as? String,
                props = (map["props"] as? Map<String, Any?>) ?: emptyMap(),
                style = map["style"] as? Map<String, Any?>,
                events = map["events"] as? Map<String, Any?>,
                children = parsedChildren,
                slots = parsedSlots,
                visibility = parsedVisibility,
                repeat = parsedRepeat,
                themeRef = map["themeRef"] as? String,
                testId = map["testId"] as? String
            )
        }
    }
}
