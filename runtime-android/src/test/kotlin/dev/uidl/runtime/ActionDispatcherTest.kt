package dev.uidl.runtime

import dev.uidl.runtime.actions.ActionDispatcher
import dev.uidl.runtime.spec.UidlErrorCodes
import dev.uidl.runtime.spec.UidlException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class ActionDispatcherTest {

    @Test
    fun rejectsDocumentSetStateIntoReservedDataEnvelope() {
        val state = mutableMapOf<String, Any?>("count" to 0)
        val dispatcher = ActionDispatcher(state, emptyMap())

        assertThatThrownBy {
            dispatcher.execute(
                mapOf(
                    "setState" to mapOf(
                        "path" to "\$data.invoices.status",
                        "value" to "success"
                    )
                )
            )
        }
            .isInstanceOf(UidlException::class.java)
            .extracting("code")
            .isEqualTo(UidlErrorCodes.INVALID_STATE)

        assertThat(state).doesNotContainKey("\$data")
        assertThat(state["count"]).isEqualTo(0)
    }

    @Test
    fun writesOrdinaryStatePaths() {
        val state = mutableMapOf<String, Any?>("count" to 0)
        val dispatcher = ActionDispatcher(state, emptyMap())

        dispatcher.execute(
            mapOf(
                "setState" to mapOf(
                    "path" to "count",
                    "value" to 2
                )
            )
        )

        assertThat(state["count"]).isEqualTo(2)
    }
}
