package dev.uidl.runtime

import dev.uidl.runtime.compose.UidlDocumentSession
import dev.uidl.runtime.model.UidlDocument
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class UidlTreeRendererTest {

    @Test
    fun buttonClickIncrementsBoundCounter() {
        val document = UidlDocument.fromMap(
            mapOf(
                "version" to "1.0.0",
                "id" to "counter-screen",
                "name" to "Counter Screen",
                "initialState" to mapOf("counter" to 0),
                "root" to mapOf(
                    "id" to "root",
                    "type" to "Column",
                    "children" to listOf(
                        mapOf(
                            "id" to "count_display",
                            "type" to "Text",
                            "props" to mapOf("value" to mapOf("\$bind" to "state.counter"))
                        ),
                        mapOf(
                            "id" to "inc_btn",
                            "type" to "Button",
                            "props" to mapOf("label" to "Increment"),
                            "events" to mapOf(
                                "onClick" to mapOf(
                                    "setState" to mapOf(
                                        "path" to "counter",
                                        "value" to mapOf(
                                            "op" to "add",
                                            "left" to mapOf("\$bind" to "state.counter"),
                                            "right" to mapOf("literal" to 1)
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )

        val session = UidlDocumentSession(document)
        assertThat(textValue(session.render(), "count_display")).isEqualTo(0)

        session.click("inc_btn")
        assertThat(textValue(session.render(), "count_display")).isEqualTo(1)

        session.click("inc_btn")
        assertThat(textValue(session.render(), "count_display")).isEqualTo(2)
    }

    private fun textValue(
        tree: dev.uidl.runtime.compose.UidlRenderedNode,
        id: String
    ): Any? {
        if (tree.id == id) return tree.props["value"]
        return tree.children.firstNotNullOfOrNull { textValue(it, id) }
    }
}
