package dev.uidl.runtime.actions

import dev.uidl.runtime.binding.BindingResolver
import dev.uidl.runtime.evaluator.ExpressionEvaluator
import dev.uidl.runtime.spec.UidlErrorCodes
import dev.uidl.runtime.spec.UidlException

typealias NavigationHandler = (route: String, params: Map<String, Any?>?) -> Unit
typealias SnackbarHandler = (message: String) -> Unit
typealias MutationHandler = (mutation: String, payload: Map<String, Any?>) -> Any?
typealias CommandHandler = (command: String, params: Map<String, Any?>) -> Any?
typealias DownloadHandler = (url: String, filename: String?) -> Unit

class ActionDispatcher(
    val state: MutableMap<String, Any?>,
    val scope: Map<String, Any?>,
    var onNavigate: NavigationHandler? = null,
    var onSnackbar: SnackbarHandler? = null,
    var onMutate: MutationHandler? = null,
    var onCommand: CommandHandler? = null,
    var onDownload: DownloadHandler? = null,
    var onStateChanged: (() -> Unit)? = null
) {
    companion object {
        val knownActionKinds: Set<String> = setOf(
            "sequence",
            "if",
            "setState",
            "navigate",
            "api",
            "mutate",
            "command",
            "download",
            "query",
            "showSnackbar",
            "showDialog",
            "validate"
        )

        fun isReservedDataEnvelopePath(path: String): Boolean {
            val normalized = if (path.startsWith("state.")) path.substring("state.".length) else path
            return normalized == "\$data" || normalized.startsWith("\$data.")
        }
    }

    @Suppress("UNCHECKED_CAST")
    fun execute(action: Any?, eventPayload: Any? = null) {
        if (action == null) return

        if (action is List<*>) {
            for (subAction in action) {
                execute(subAction, eventPayload)
            }
            return
        }

        if (action !is Map<*, *>) {
            throw UidlException(
                code = UidlErrorCodes.UNKNOWN_ACTION,
                message = "Action must be a map or list of maps"
            )
        }

        val map = action as Map<String, Any?>
        val actionKey = map.keys.firstOrNull { knownActionKinds.contains(it) } ?: ""

        if (actionKey.isEmpty()) {
            throw UidlException(
                code = UidlErrorCodes.UNKNOWN_ACTION,
                message = "Unrecognized action payload: ${map.keys}"
            )
        }

        val payload = map[actionKey]

        when (actionKey) {
            "sequence" -> {
                if (payload is List<*>) {
                    for (step in payload) {
                        execute(step, eventPayload)
                    }
                }
            }

            "if" -> {
                if (payload is Map<*, *>) {
                    val condMap = payload as Map<String, Any?>
                    val condition = condMap["condition"]
                    val mergedScope = scope.toMutableMap().apply {
                        if (eventPayload != null) put("event", eventPayload)
                    }
                    if (ExpressionEvaluator.evaluateCondition(condition, mergedScope)) {
                        execute(condMap["then"], eventPayload)
                    } else {
                        execute(condMap["else"], eventPayload)
                    }
                }
            }

            "setState" -> {
                if (payload is Map<*, *>) {
                    val p = payload as Map<String, Any?>
                    val targetPath = p["path"] as? String
                    val value = p["value"]
                    val mergedScope = scope.toMutableMap().apply {
                        if (eventPayload != null) put("event", eventPayload)
                    }
                    val resolvedValue = ExpressionEvaluator.evaluate(value, mergedScope)
                    if (targetPath != null) {
                        if (isReservedDataEnvelopePath(targetPath)) {
                            throw UidlException(
                                code = UidlErrorCodes.INVALID_STATE,
                                message = "setState path \"$targetPath\" targets the reserved \$data envelope. Documents may read state.\$data.* but must not write it."
                            )
                        }
                        BindingResolver.setByPath(state, targetPath, resolvedValue)
                        onStateChanged?.invoke()
                    }
                }
            }

            "navigate" -> {
                if (payload is Map<*, *>) {
                    val p = payload as Map<String, Any?>
                    val route = p["route"] as? String ?: ""
                    val params = p["params"] as? Map<String, Any?>
                    onNavigate?.invoke(route, params)
                } else if (payload is String) {
                    onNavigate?.invoke(payload, null)
                }
            }

            "showSnackbar" -> {
                val message = if (payload is Map<*, *>) {
                    (payload as Map<String, Any?>)["message"]?.toString() ?: ""
                } else {
                    payload?.toString() ?: ""
                }
                onSnackbar?.invoke(message)
            }

            "download" -> {
                if (payload is Map<*, *>) {
                    val p = payload as Map<String, Any?>
                    val url = p["url"]?.toString() ?: ""
                    val filename = p["filename"]?.toString()
                    onDownload?.invoke(url, filename)
                }
            }

            "mutate" -> {
                if (payload is Map<*, *>) {
                    val p = payload as Map<String, Any?>
                    val mutation = p["mutation"]?.toString() ?: ""
                    val payloadData = (p["payload"] as? Map<String, Any?>) ?: emptyMap()
                    onMutate?.invoke(mutation, payloadData)
                }
            }

            "command" -> {
                if (payload is Map<*, *>) {
                    val p = payload as Map<String, Any?>
                    val cmd = p["command"]?.toString() ?: ""
                    val params = (p["params"] as? Map<String, Any?>) ?: emptyMap()
                    onCommand?.invoke(cmd, params)
                }
            }
        }
    }
}
