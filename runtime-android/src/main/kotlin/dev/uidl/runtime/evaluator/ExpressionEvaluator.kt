package dev.uidl.runtime.evaluator

import dev.uidl.runtime.binding.BindingResolver
import dev.uidl.runtime.spec.Constants

object ExpressionEvaluator {

    fun evaluate(expr: Any?, scope: Map<String, Any?>): Any? {
        return evaluateDepth(expr, scope, 0)
    }

    fun evaluateCondition(expr: Any?, scope: Map<String, Any?>): Boolean {
        val result = evaluate(expr, scope) ?: return false
        return when (result) {
            is Boolean -> result
            is Number -> result.toDouble() != 0.0 && !result.toDouble().isNaN()
            is String -> result.isNotEmpty()
            is Collection<*> -> result.isNotEmpty()
            is Map<*, *> -> result.isNotEmpty()
            else -> false
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun evaluateDepth(node: Any?, scope: Map<String, Any?>, depth: Int): Any? {
        if (node == null) return null
        if (depth > Constants.MAX_EXPRESSION_DEPTH) {
            return null
        }

        if (node is Number || node is Boolean || node is String) {
            return node
        }

        if (node !is Map<*, *>) {
            return node
        }

        val map = node as Map<String, Any?>

        // 1. Literal leaf
        if (map.containsKey("literal")) {
            return map["literal"]
        }

        // 2. $bind leaf
        if (map.containsKey("\$bind")) {
            val bindPath = map["\$bind"]
            if (bindPath is String) {
                return BindingResolver.resolvePath(bindPath, scope)
            }
            return null
        }

        // 3. $expr wrapper leaf
        if (map.containsKey("\$expr")) {
            return evaluateDepth(map["\$expr"], scope, depth + 1)
        }

        // 4. Path leaf
        if (map.containsKey("path")) {
            val path = map["path"]
            if (path is String) {
                return BindingResolver.resolvePath(path, scope)
            }
            return null
        }

        // 5. Canonical op form: {"op": "...", ...}
        if (map.containsKey("op")) {
            return evaluateOp(map, scope, depth)
        }

        // 6. Legacy prefix / infix forms
        if (map.containsKey("==")) {
            val operands = map["=="] as? List<*>
            if (operands != null && operands.size >= 2) {
                return strictEquals(
                    evaluateDepth(operands[0], scope, depth + 1),
                    evaluateDepth(operands[1], scope, depth + 1)
                )
            }
            return false
        }

        if (map.containsKey("!=")) {
            val operands = map["!="] as? List<*>
            if (operands != null && operands.size >= 2) {
                return !strictEquals(
                    evaluateDepth(operands[0], scope, depth + 1),
                    evaluateDepth(operands[1], scope, depth + 1)
                )
            }
            return true
        }

        if (map.containsKey("and")) {
            val operands = map["and"] as? List<*>
            if (operands != null && operands.size >= 2) {
                val left = evaluateDepth(operands[0], scope, depth + 1)
                if (!evaluateCondition(left, scope)) return false
                val right = evaluateDepth(operands[1], scope, depth + 1)
                return evaluateCondition(right, scope)
            }
            return false
        }

        if (map.containsKey("or")) {
            val operands = map["or"] as? List<*>
            if (operands != null && operands.size >= 2) {
                val left = evaluateDepth(operands[0], scope, depth + 1)
                if (evaluateCondition(left, scope)) return true
                val right = evaluateDepth(operands[1], scope, depth + 1)
                return evaluateCondition(right, scope)
            }
            return false
        }

        if (map.containsKey("not")) {
            val operand = map["not"]
            return !evaluateCondition(evaluateDepth(operand, scope, depth + 1), scope)
        }

        if (map.containsKey("if")) {
            val operands = map["if"] as? List<*>
            if (operands != null && operands.size >= 3) {
                val cond = evaluateDepth(operands[0], scope, depth + 1)
                return if (evaluateCondition(cond, scope)) {
                    evaluateDepth(operands[1], scope, depth + 1)
                } else {
                    evaluateDepth(operands[2], scope, depth + 1)
                }
            }
            return null
        }

        if (map.containsKey("??")) {
            val operands = map["??"] as? List<*>
            if (operands != null && operands.size >= 2) {
                val left = evaluateDepth(operands[0], scope, depth + 1)
                if (left != null) return left
                return evaluateDepth(operands[1], scope, depth + 1)
            }
            return null
        }

        return null
    }

    private fun evaluateOp(node: Map<String, Any?>, scope: Map<String, Any?>, depth: Int): Any? {
        val op = node["op"] as? String ?: return null

        fun evalOperand(operand: Any?): Any? = evaluateDepth(operand, scope, depth + 1)

        return when (op) {
            "eq" -> strictEquals(evalOperand(node["left"]), evalOperand(node["right"]))
            "ne", "neq" -> !strictEquals(evalOperand(node["left"]), evalOperand(node["right"]))
            "gt" -> numericCompare(evalOperand(node["left"]), evalOperand(node["right"])) { a, b -> a > b }
            "gte" -> numericCompare(evalOperand(node["left"]), evalOperand(node["right"])) { a, b -> a >= b }
            "lt" -> numericCompare(evalOperand(node["left"]), evalOperand(node["right"])) { a, b -> a < b }
            "lte" -> numericCompare(evalOperand(node["left"]), evalOperand(node["right"])) { a, b -> a <= b }
            "and" -> {
                val left = evalOperand(node["left"])
                if (!evaluateCondition(left, scope)) return false
                val right = evalOperand(node["right"])
                evaluateCondition(right, scope)
            }
            "or" -> {
                val left = evalOperand(node["left"])
                if (evaluateCondition(left, scope)) return true
                val right = evalOperand(node["right"])
                evaluateCondition(right, scope)
            }
            "not" -> {
                val operand = if (node.containsKey("v")) node["v"] else (node["right"] ?: node["left"])
                !evaluateCondition(evalOperand(operand), scope)
            }
            "add" -> arithmetic(evalOperand(node["left"]), evalOperand(node["right"])) { a, b -> a + b }
            "subtract" -> arithmetic(evalOperand(node["left"]), evalOperand(node["right"])) { a, b -> a - b }
            "multiply" -> arithmetic(evalOperand(node["left"]), evalOperand(node["right"])) { a, b -> a * b }
            "divide" -> {
                val rightNum = toFiniteNumber(evalOperand(node["right"]))
                if (rightNum == null || rightNum.toDouble() == 0.0) {
                    null
                } else {
                    arithmetic(evalOperand(node["left"]), rightNum) { a, b -> a / b }
                }
            }
            "contains" -> contains(evalOperand(node["left"]), evalOperand(node["right"]))
            "startsWith" -> startsWith(evalOperand(node["left"]), evalOperand(node["right"]))
            "coalesce" -> {
                val left = evalOperand(node["left"])
                left ?: evalOperand(node["right"])
            }
            "if", "ternary" -> {
                val test = evalOperand(if (node.containsKey("test")) node["test"] else node["condition"])
                if (evaluateCondition(test, scope)) {
                    evalOperand(node["then"])
                } else {
                    evalOperand(node["else"])
                }
            }
            else -> null
        }
    }

    private fun strictEquals(a: Any?, b: Any?): Boolean {
        if (a == null && b == null) return true
        if (a == null || b == null) return false

        // Type parity
        if (a is Number && b !is Number) return false
        if (b is Number && a !is Number) return false
        if (a is Boolean && b !is Boolean) return false
        if (b is Boolean && a !is Boolean) return false
        if (a is String && b !is String) return false
        if (b is String && a !is String) return false

        // In UIDL spec, objects/maps and lists compare by reference identity
        if ((a is Map<*, *> && b is Map<*, *>) || (a is List<*> && b is List<*>)) {
            return a === b
        }

        if (a is Number && b is Number) {
            return a.toDouble() == b.toDouble()
        }

        return a == b
    }

    private fun toFiniteNumber(value: Any?): Double? {
        return when (value) {
            is Number -> {
                val d = value.toDouble()
                if (d.isFinite()) d else null
            }
            is String -> {
                val parsed = value.toDoubleOrNull()
                if (parsed != null && parsed.isFinite()) parsed else null
            }
            else -> null
        }
    }

    private fun numericCompare(left: Any?, right: Any?, predicate: (Double, Double) -> Boolean): Boolean {
        val l = toFiniteNumber(left) ?: return false
        val r = toFiniteNumber(right) ?: return false
        return predicate(l, r)
    }

    private fun arithmetic(left: Any?, right: Any?, op: (Double, Double) -> Double): Any? {
        val l = toFiniteNumber(left) ?: return null
        val r = toFiniteNumber(right) ?: return null
        val result = op(l, r)
        if (!result.isFinite()) return null

        val roundedLong = result.toLong()
        return if (result == roundedLong.toDouble()) {
            if (roundedLong in Int.MIN_VALUE..Int.MAX_VALUE) {
                roundedLong.toInt()
            } else {
                roundedLong
            }
        } else {
            result
        }
    }

    private fun contains(target: Any?, item: Any?): Boolean {
        if (target == null || item == null) return false
        if (target is String && item is String) {
            return target.contains(item)
        }
        if (target is Collection<*>) {
            return target.any { strictEquals(it, item) }
        }
        return false
    }

    private fun startsWith(target: Any?, prefix: Any?): Boolean {
        if (target is String && prefix is String) {
            return target.startsWith(prefix)
        }
        return false
    }
}
