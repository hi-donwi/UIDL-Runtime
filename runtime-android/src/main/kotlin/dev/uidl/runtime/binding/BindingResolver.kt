package dev.uidl.runtime.binding

object BindingResolver {
    val renderScopePrefixes: List<String> = listOf("local", "state", "session", "route", "data", "event")
    private val bindPrefixPattern: Regex = Regex("^(local|state|session|route|data|event)(\\..+)?$")
    private val templatePattern: Regex = Regex("\\$\\{([^}]+)\\}")

    fun isBindPath(path: String): Boolean {
        return bindPrefixPattern.matches(path)
    }

    @Suppress("UNCHECKED_CAST")
    fun getByPath(obj: Any?, path: String): Any? {
        if (obj == null) return null
        if (path.isEmpty()) return obj

        val keys = path.split('.')
        var current: Any? = obj

        for (key in keys) {
            current = when (current) {
                is Map<*, *> -> (current as Map<String, Any?>)[key]
                is List<*> -> {
                    val index = key.toIntOrNull()
                    if (index != null && index in current.indices) {
                        current[index]
                    } else {
                        return null
                    }
                }
                else -> return null
            }
        }
        return current
    }

    @Suppress("UNCHECKED_CAST")
    fun setByPath(obj: MutableMap<String, Any?>, path: String, value: Any?) {
        val keys = path.split('.').toMutableList()
        if (keys.isEmpty()) return

        val lastKey = keys.removeAt(keys.size - 1)
        var current: MutableMap<String, Any?> = obj

        for (key in keys) {
            val next = current[key]
            if (next !is MutableMap<*, *>) {
                val newMap = mutableMapOf<String, Any?>()
                current[key] = newMap
                current = newMap
            } else {
                current = next as MutableMap<String, Any?>
            }
        }
        current[lastKey] = value
    }

    fun resolvePath(path: String, scope: Map<String, Any?>): Any? {
        for (prefix in renderScopePrefixes) {
            if (path.startsWith("$prefix.")) {
                val target = scope[prefix] ?: return null
                val subPath = path.substring(prefix.length + 1)
                return getByPath(target, subPath)
            } else if (path == prefix) {
                return scope[prefix]
            }
        }

        // Fallback: direct path resolution against root scope
        return getByPath(scope, path)
    }

    @Suppress("UNCHECKED_CAST")
    fun resolveBinding(value: Any?, scope: Map<String, Any?>): Any? {
        if (value is Map<*, *>) {
            val bindPath = value["\$bind"]
            if (bindPath is String) {
                return resolvePath(bindPath, scope)
            }
        }
        return value
    }

    fun resolveTemplate(template: String, scope: Map<String, Any?>): String {
        return templatePattern.replace(template) { matchResult ->
            val expr = matchResult.groupValues[1].trim()
            val resolved = resolvePath(expr, scope)
            resolved?.toString() ?: ""
        }
    }
}
