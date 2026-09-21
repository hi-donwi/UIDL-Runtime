package dev.uidl.runtime

import dev.uidl.runtime.parser.UidlParser
import dev.uidl.runtime.spec.DocumentVersionException
import dev.uidl.runtime.spec.UidlErrorCodes
import dev.uidl.runtime.spec.UidlException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class UidlParserTest {

    @Test
    fun `parses valid document successfully`() {
        val json = """
            {
              "version": "1.0.0",
              "id": "doc-test",
              "name": "Test Document",
              "root": {
                "id": "screen-1",
                "type": "Screen",
                "children": [
                  { "id": "text-1", "type": "Text", "props": { "value": "Hello World" } }
                ]
              },
              "initialState": { "counter": 0 }
            }
        """.trimIndent()

        val doc = UidlParser.parse(json)
        assertThat(doc.id).isEqualTo("doc-test")
        assertThat(doc.name).isEqualTo("Test Document")
        assertThat(doc.root.id).isEqualTo("screen-1")
        assertThat(doc.root.type).isEqualTo("Screen")
        assertThat(doc.root.children).hasSize(1)
        assertThat(doc.root.children[0].id).isEqualTo("text-1")
        assertThat(doc.initialState["counter"]).isEqualTo(0)
    }

    @Test
    fun `fails on missing version`() {
        val docMap = mapOf(
            "id" to "doc-no-ver",
            "name" to "No Version",
            "root" to mapOf("id" to "root-1", "type" to "Screen")
        )

        assertThatThrownBy { UidlParser.parse(docMap) }
            .isInstanceOf(UidlException::class.java)
            .hasFieldOrPropertyWithValue("code", UidlErrorCodes.DOCUMENT_VALIDATION)
    }

    @Test
    fun `fails on malformed version`() {
        val docMap = mapOf(
            "version" to "v1",
            "id" to "doc-bad-ver",
            "root" to mapOf("id" to "root-1", "type" to "Screen")
        )

        assertThatThrownBy { UidlParser.parse(docMap) }
            .isInstanceOf(DocumentVersionException::class.java)
            .hasFieldOrPropertyWithValue("code", UidlErrorCodes.MALFORMED_VERSION)
    }

    @Test
    fun `fails on unsupported version major`() {
        val docMap = mapOf(
            "version" to "2.0.0",
            "id" to "doc-future-ver",
            "root" to mapOf("id" to "root-1", "type" to "Screen")
        )

        assertThatThrownBy { UidlParser.parse(docMap) }
            .isInstanceOf(DocumentVersionException::class.java)
            .hasFieldOrPropertyWithValue("code", UidlErrorCodes.UNSUPPORTED_VERSION)
    }

    @Test
    fun `fails on missing root node`() {
        val docMap = mapOf(
            "version" to "1.0",
            "id" to "doc-no-root"
        )

        assertThatThrownBy { UidlParser.parse(docMap) }
            .isInstanceOf(UidlException::class.java)
            .hasFieldOrPropertyWithValue("code", UidlErrorCodes.DOCUMENT_VALIDATION)
    }
}
