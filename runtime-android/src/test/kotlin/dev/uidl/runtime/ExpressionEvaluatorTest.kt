package dev.uidl.runtime

import dev.uidl.runtime.evaluator.ExpressionEvaluator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ExpressionEvaluatorTest {

    @Test
    fun `evaluates literals`() {
        val scope = emptyMap<String, Any?>()
        assertThat(ExpressionEvaluator.evaluate(42, scope)).isEqualTo(42)
        assertThat(ExpressionEvaluator.evaluate("hello", scope)).isEqualTo("hello")
        assertThat(ExpressionEvaluator.evaluate(true, scope)).isEqualTo(true)
        assertThat(ExpressionEvaluator.evaluate(mapOf("literal" to "val"), scope)).isEqualTo("val")
    }

    @Test
    fun `evaluates arithmetic operations`() {
        val scope = emptyMap<String, Any?>()
        val addExpr = mapOf("op" to "add", "left" to mapOf("literal" to 10), "right" to mapOf("literal" to 5))
        assertThat(ExpressionEvaluator.evaluate(addExpr, scope)).isEqualTo(15)

        val multExpr = mapOf("op" to "multiply", "left" to mapOf("literal" to 4), "right" to mapOf("literal" to 3))
        assertThat(ExpressionEvaluator.evaluate(multExpr, scope)).isEqualTo(12)

        val divZeroExpr = mapOf("op" to "divide", "left" to mapOf("literal" to 10), "right" to mapOf("literal" to 0))
        assertThat(ExpressionEvaluator.evaluate(divZeroExpr, scope)).isNull()
    }

    @Test
    fun `evaluates conditional truthiness`() {
        val scope = emptyMap<String, Any?>()
        assertThat(ExpressionEvaluator.evaluateCondition(true, scope)).isTrue()
        assertThat(ExpressionEvaluator.evaluateCondition(false, scope)).isFalse()
        assertThat(ExpressionEvaluator.evaluateCondition(1, scope)).isTrue()
        assertThat(ExpressionEvaluator.evaluateCondition(0, scope)).isFalse()
        assertThat(ExpressionEvaluator.evaluateCondition("non-empty", scope)).isTrue()
        assertThat(ExpressionEvaluator.evaluateCondition("", scope)).isFalse()
        assertThat(ExpressionEvaluator.evaluateCondition(listOf("a"), scope)).isTrue()
        assertThat(ExpressionEvaluator.evaluateCondition(emptyList<Any>(), scope)).isFalse()
    }

    @Test
    fun `evaluates ternary if`() {
        val scope = mapOf("state" to mapOf("isAdmin" to true))
        val ternaryExpr = mapOf(
            "op" to "if",
            "test" to mapOf("\$bind" to "state.isAdmin"),
            "then" to mapOf("literal" to "Welcome Admin"),
            "else" to mapOf("literal" to "Welcome User")
        )
        assertThat(ExpressionEvaluator.evaluate(ternaryExpr, scope)).isEqualTo("Welcome Admin")
    }

    @Test
    fun `evaluates coalesce`() {
        val scope = mapOf("state" to mapOf("title" to null, "fallback" to "Default Title"))
        val coalesceExpr = mapOf(
            "op" to "coalesce",
            "left" to mapOf("\$bind" to "state.title"),
            "right" to mapOf("\$bind" to "state.fallback")
        )
        assertThat(ExpressionEvaluator.evaluate(coalesceExpr, scope)).isEqualTo("Default Title")
    }
}
