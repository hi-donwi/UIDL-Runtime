package dev.uidl.runtime.parser

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import dev.uidl.runtime.model.UidlDocument
import dev.uidl.runtime.model.UidlNode
import dev.uidl.runtime.spec.DocumentVersionException
import dev.uidl.runtime.spec.UidlErrorCodes
import dev.uidl.runtime.spec.UidlException

object UidlParser {
    private val mapper = jacksonObjectMapper()
    private val versionPattern = Regex("^(\\d+)\\.(\\d+)(?:\\..*)?$")
    private const val SUPPORTED_MAJOR = 1

    fun parse(input: Any?): UidlDocument {
        val map = when (input) {
            is String -> {
                try {
                    mapper.readValue<Map<String, Any?>>(input)
                } catch (e: Exception) {
                    throw UidlException(
                        code = UidlErrorCodes.DOCUMENT_VALIDATION,
                        message = "Malformed JSON input: ${e.message}",
                        cause = e
                    )
                }
            }
            is Map<*, *> -> {
                @Suppress("UNCHECKED_CAST")
                input as Map<String, Any?>
            }
            null -> {
                throw UidlException(
                    code = UidlErrorCodes.DOCUMENT_VALIDATION,
                    message = "Input document is null"
                )
            }
            else -> {
                throw UidlException(
                    code = UidlErrorCodes.DOCUMENT_VALIDATION,
                    message = "Expected JSON String or Map, got ${input::class.simpleName}"
                )
            }
        }

        // 1. Validate presence of version
        val rawVersion = map["version"]
        if (rawVersion == null) {
            throw UidlException(
                code = UidlErrorCodes.DOCUMENT_VALIDATION,
                message = "Missing required 'version' in UIDL document"
            )
        }

        val versionStr = rawVersion.toString()
        val versionMatch = versionPattern.matchEntire(versionStr)
        if (versionMatch == null) {
            throw DocumentVersionException(
                code = UidlErrorCodes.MALFORMED_VERSION,
                message = "Document version '$versionStr' is malformed; expected major.minor",
                rawVersion = versionStr
            )
        }

        val major = versionMatch.groupValues[1].toIntOrNull()
        val minor = versionMatch.groupValues[2].toIntOrNull()
        if (major == null || major != SUPPORTED_MAJOR) {
            throw DocumentVersionException(
                code = UidlErrorCodes.UNSUPPORTED_VERSION,
                message = "Document version '$versionStr' has major $major; this runtime implements UIDL spec 1.x",
                rawVersion = versionStr,
                major = major,
                minor = minor
            )
        }

        // 2. Validate presence and shape of root node
        val rawRoot = map["root"]
        if (rawRoot !is Map<*, *>) {
            throw UidlException(
                code = UidlErrorCodes.DOCUMENT_VALIDATION,
                message = "Missing or invalid 'root' node in UIDL document"
            )
        }

        @Suppress("UNCHECKED_CAST")
        val rootMap = rawRoot as Map<String, Any?>
        val rootType = rootMap["type"] as? String
        val rootId = rootMap["id"] as? String

        if (rootType.isNullOrBlank() || rootId.isNullOrBlank()) {
            throw UidlException(
                code = UidlErrorCodes.DOCUMENT_VALIDATION,
                message = "Root node must have non-blank 'id' and 'type'"
            )
        }

        return try {
            UidlDocument.fromMap(map)
        } catch (e: UidlException) {
            throw e
        } catch (e: Exception) {
            throw UidlException(
                code = UidlErrorCodes.DOCUMENT_VALIDATION,
                message = "Failed to construct UidlDocument: ${e.message}",
                cause = e
            )
        }
    }
}
