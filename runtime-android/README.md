# UIDL Android Native Runtime

Native Kotlin / Android Jetpack Compose runtime engine for UIDL (User Interface Definition Language) documents.

## Architecture

The runtime provides a layered architecture:
- **`model/`**: Pure Kotlin data structures for UIDL AST (`UidlDocument`, `UidlNode`, `UidlVisibility`, `UidlRepeat`).
- **`parser/`**: Schema-compliant document deserializer and validator (`UidlParser`).
- **`evaluator/`**: Recursive expression evaluator supporting arithmetic, comparison, logic, ternary, and nullish coalescing operators (`ExpressionEvaluator`).
- **`binding/`**: Scope-chain dot-notation path resolver, string template interpolator, and state mutation engine (`BindingResolver`).
- **`actions/`**: Event action dispatcher (`ActionDispatcher`) supporting sequential actions, branching, mutations, and navigation.
- **`compose/`**: Clean abstraction interface for Android Jetpack Compose component registration and rendering.

## Requirements

- Java 21+
- Maven wrapper included (`./mvnw`)

## Running Tests

Run the full unit and cross-platform conformance suite:

```bash
./mvnw test
```

This runs:
- Unit tests for AST parser, expression evaluator, and binding resolver.
- Full cross-platform conformance test suite (55 active test fixtures across 7 domains: expression, condition, binding, action, error, render, data).
