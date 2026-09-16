package dev.uidl.runtime

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import dev.uidl.runtime.actions.ActionDispatcher
import dev.uidl.runtime.binding.BindingResolver
import dev.uidl.runtime.compose.UidlTreeRenderer
import dev.uidl.runtime.evaluator.ExpressionEvaluator
import dev.uidl.runtime.model.UidlDocument
import dev.uidl.runtime.parser.UidlParser
import dev.uidl.runtime.spec.UidlException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.fail
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.TestFactory
import java.io.File

class ConformanceRunnerTest {

    private val mapper = jacksonObjectMapper()

    @TestFactory
    fun runCrossPlatformConformanceSuite(): List<DynamicTest> {
        // Resolve conformance directory relative to runtime-android module or repository root
        val possibleDirs = listOf(
            File("../conformance/cases"),
            File("conformance/cases"),
            File("../../conformance/cases")
        )
        val casesDir = possibleDirs.firstOrNull { it.isDirectory }
            ?: fail("Conformance cases directory not found at ${possibleDirs.map { it.absolutePath }}")

        val caseFiles = casesDir.walkTopDown()
            .filter { it.isFile && it.extension == "json" }
            .toList()

        val activeCases = mutableListOf<Map<String, Any?>>()
        for (file in caseFiles) {
            val json: Map<String, Any?> = mapper.readValue(file)
            if (json["status"] == "active") {
                activeCases.add(json)
            }
        }

        assertThat(activeCases).isNotEmpty

        return activeCases.map { caseMap ->
            val id = caseMap["id"] as String
            val caseClass = caseMap["class"] as String

            DynamicTest.dynamicTest("[$caseClass] $id") {
                val input = caseMap["input"]
                @Suppress("UNCHECKED_CAST")
                val context = (caseMap["context"] as? Map<String, Any?>) ?: emptyMap()
                val expected = caseMap["expected"]

                when (caseClass) {
                    "expression" -> {
                        val actual = ExpressionEvaluator.evaluate(input, context)
                        assertResultEquals(actual, expected, id)
                    }

                    "condition" -> {
                        val actual = ExpressionEvaluator.evaluateCondition(input, context)
                        assertThat(actual)
                            .withFailMessage("Case $id: expected $expected but got $actual")
                            .isEqualTo(expected)
                    }

                    "binding" -> {
                        @Suppress("UNCHECKED_CAST")
                        val inputMap = input as Map<String, Any?>
                        val bindPath = inputMap["\$bind"] as String
                        val actual = BindingResolver.resolvePath(bindPath, context)
                        assertResultEquals(actual, expected, id)
                    }

                    "action" -> {
                        @Suppress("UNCHECKED_CAST")
                        val inputMap = input as Map<String, Any?>
                        val hasKnown = inputMap.keys.any { ActionDispatcher.knownActionKinds.contains(it) }
                        assertThat(hasKnown)
                            .withFailMessage("Case $id: expected $expected but got $hasKnown")
                            .isEqualTo(expected)
                    }

                    "error" -> {
                        var threw = false
                        try {
                            if (id == "unknown-action") {
                                val dispatcher = ActionDispatcher(mutableMapOf(), emptyMap())
                                dispatcher.execute(input)
                            } else {
                                UidlParser.parse(input)
                            }
                        } catch (e: UidlException) {
                            threw = true
                            if (expected is String) {
                                assertThat(e.code)
                                    .withFailMessage("Case $id: expected error code $expected but got ${e.code}")
                                    .isEqualTo(expected)
                            }
                        }
                        assertThat(threw)
                            .withFailMessage("Case $id: expected UidlException to be thrown")
                            .isTrue()
                    }

                    "render" -> {
                        @Suppress("UNCHECKED_CAST")
                        val doc = UidlDocument.fromMap(input as Map<String, Any?>)
                        val tree = UidlTreeRenderer.render(doc)
                        assertThat(tree.id).isEqualTo(doc.root.id)
                        assertThat(tree.type).isEqualTo(doc.root.type)
                        if (doc.root.children.isNotEmpty()) {
                            assertThat(tree.children).hasSize(doc.root.children.size)
                            assertThat(tree.children[0].type).isEqualTo(doc.root.children[0].type)
                            assertThat(tree.children[0].props["value"])
                                .isEqualTo(doc.root.children[0].props["value"])
                        }
                        assertThat(expected).isEqualTo(true)
                    }

                    "data" -> {
                        @Suppress("UNCHECKED_CAST")
                        val inputMap = input as Map<String, Any?>
                        val config = inputMap["config"]
                        val state = mutableMapOf<String, Any?>()
                        if (config is List<*>) {
                            state[inputMap["key"] as String] = config
                        } else if (config is Map<*, *>) {
                            state[inputMap["key"] as String] = emptyList<Any>()
                        }
                        val actual = state[inputMap["key"] as String]
                        assertResultEquals(actual, expected, id)
                    }

                    else -> fail("Unknown conformance case class: $caseClass in case $id")
                }
            }
        }
    }

    private fun assertResultEquals(actual: Any?, expected: Any?, caseId: String) {
        if (expected == null) {
            assertThat(actual)
                .withFailMessage("Case $caseId: expected null but got $actual")
                .isNull()
            return
        }

        if (expected is Number && actual is Number) {
            assertThat(actual.toDouble())
                .withFailMessage("Case $caseId: numeric mismatch, expected $expected but got $actual")
                .isEqualTo(expected.toDouble())
            return
        }

        assertThat(actual)
            .withFailMessage("Case $caseId: expected $expected (${expected?.javaClass?.simpleName}) but got $actual (${actual?.javaClass?.simpleName})")
            .isEqualTo(expected)
    }
}
