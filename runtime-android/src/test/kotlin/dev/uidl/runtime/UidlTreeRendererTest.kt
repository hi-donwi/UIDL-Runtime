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

    @Test
    fun rowAndContainerRenderChildren() {
        val document = UidlDocument.fromMap(
            mapOf(
                "version" to "1.0.0",
                "id" to "layout-screen",
                "name" to "Layout Screen",
                "root" to mapOf(
                    "id" to "root",
                    "type" to "Row",
                    "children" to listOf(
                        mapOf(
                            "id" to "box",
                            "type" to "Container",
                            "children" to listOf(
                                mapOf(
                                    "id" to "label",
                                    "type" to "Text",
                                    "props" to mapOf("value" to "hello")
                                )
                            )
                        )
                    )
                )
            )
        )

        val tree = UidlDocumentSession(document).render()
        assertThat(tree.type).isEqualTo("Row")
        assertThat(tree.children).hasSize(1)
        assertThat(tree.children[0].type).isEqualTo("Container")
        assertThat(tree.children[0].children[0].id).isEqualTo("label")
        assertThat(tree.children[0].children[0].props["value"]).isEqualTo("hello")
    }

    @Test
    fun textFieldOnChangeWritesBoundState() {
        val document = UidlDocument.fromMap(
            mapOf(
                "version" to "1.0.0",
                "id" to "form-screen",
                "name" to "Form Screen",
                "initialState" to mapOf("name" to ""),
                "root" to mapOf(
                    "id" to "root",
                    "type" to "Column",
                    "children" to listOf(
                        mapOf(
                            "id" to "name_field",
                            "type" to "TextField",
                            "props" to mapOf("value" to mapOf("\$bind" to "state.name")),
                            "events" to mapOf(
                                "onChange" to mapOf(
                                    "setState" to mapOf(
                                        "path" to "name",
                                        "value" to mapOf("\$bind" to "event")
                                    )
                                )
                            )
                        ),
                        mapOf(
                            "id" to "name_display",
                            "type" to "Text",
                            "props" to mapOf("value" to mapOf("\$bind" to "state.name"))
                        )
                    )
                )
            )
        )

        val session = UidlDocumentSession(document)
        assertThat(textValue(session.render(), "name_display")).isEqualTo("")
        assertThat(propValue(session.render(), "name_field", "value")).isEqualTo("")

        session.change("name_field", "Ada")
        val after = session.render()
        assertThat(propValue(after, "name_field", "value")).isEqualTo("Ada")
        assertThat(textValue(after, "name_display")).isEqualTo("Ada")
    }

    private fun textValue(
        tree: dev.uidl.runtime.compose.UidlRenderedNode,
        id: String
    ): Any? {
        if (tree.id == id) return tree.props["value"]
        return tree.children.firstNotNullOfOrNull { textValue(it, id) }
    }

    private fun propValue(
        tree: dev.uidl.runtime.compose.UidlRenderedNode,
        id: String,
        prop: String
    ): Any? {
        if (tree.id == id) return tree.props[prop]
        return tree.children.firstNotNullOfOrNull { propValue(it, id, prop) }
    }
}
