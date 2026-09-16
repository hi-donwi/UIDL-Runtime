package dev.uidl.runtime.spec

object UidlErrorCodes {
    const val DOCUMENT_VALIDATION = "DOCUMENT_VALIDATION"
    const val INVALID_DOCUMENT = "DOCUMENT_VALIDATION"
    const val INVALID_NODE = "DOCUMENT_VALIDATION"
    const val UNSUPPORTED_VERSION = "UNSUPPORTED_VERSION"
    const val MALFORMED_VERSION = "MALFORMED_VERSION"
    const val UNKNOWN_ACTION = "UNKNOWN_ACTION"
    const val UNKNOWN_COMPONENT = "UNKNOWN_COMPONENT"
    const val EVALUATION_ERROR = "EVALUATION_ERROR"
    const val BINDING_ERROR = "BINDING_ERROR"
    const val COMPLEXITY_EXCEEDED = "COMPLEXITY_EXCEEDED"
}

open class UidlException(
    val code: String,
    override val message: String,
    cause: Throwable? = null
) : RuntimeException("[$code] $message", cause)

class DocumentVersionException(
    code: String,
    message: String,
    val rawVersion: String,
    val major: Int? = null,
    val minor: Int? = null
) : UidlException(code, message)
