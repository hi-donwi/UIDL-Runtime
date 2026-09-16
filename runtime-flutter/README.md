# uidl_flutter

Native Flutter runtime implementation for UIDL (Universal Interface Definition Language) documents, providing a native widget renderer and cross-platform semantic execution.

## Features

- **Document Parsing & Version Guard**: Parses raw JSON maps or strings into strongly typed `UidlDocument` and `UidlNode` trees, strictly enforcing UIDL spec versioning (`major.minor`).
- **Bounded Expression Language**: Canonical expression evaluator supporting arithmetic, comparison, logic, strings, arrays, and ternaries with a bounded recursion depth of 64 levels.
- **Scope & Binding Resolution**: Full support for `$bind` across `state.*`, `route.*`, `session.*`, and `data.*` scopes without platform leaks.
- **Native Widget Mapping**: Translates declarative UIDL node types (`Column`, `Row`, `Container`, `Text`, `Button`, `TextField`, `ListView`, etc.) into idiomatic Flutter widgets.
- **Action Dispatcher**: Native action execution for `sequence`, `if`, `setState`, `navigate`, `api`, `mutate`, `command`, and `download`.
- **100% Conformance Verified**: Executes the language-agnostic cross-platform test suite from `conformance/cases/**/*.json`.

## Getting Started

Add `uidl_flutter` to your `pubspec.yaml`:

```yaml
dependencies:
  uidl_flutter: ^0.1.4
```

## Usage

```dart
import 'package:flutter/material.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Parse UIDL document from JSON string or Map
    final doc = UidlParser.parse({
      'version': '1.0.0',
      'id': 'profile-screen',
      'name': 'User Profile',
      'initialState': {'counter': 0},
      'root': {
        'id': 'root',
        'type': 'Column',
        'children': [
          {
            'id': 'title',
            'type': 'Text',
            'props': {'value': 'Hello from UIDL Flutter!'},
          },
          {
            'id': 'counter_display',
            'type': 'Text',
            'props': {
              'value': {r'$bind': 'state.counter'},
            },
          },
          {
            'id': 'btn',
            'type': 'Button',
            'props': {'label': 'Increment'},
            'events': {
              'onClick': {
                'setState': {
                  'path': 'counter',
                  'value': {
                    'op': 'add',
                    'left': {r'$bind': 'state.counter'},
                    'right': {'literal': 1},
                  },
                },
              },
            },
          },
        ],
      },
    });

    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text(doc.name)),
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: UidlRenderer(document: doc),
        ),
      ),
    );
  }
}
```

## Running Conformance Tests

The Flutter runtime executes the shared test suite in `conformance/cases/`:

```bash
flutter test
```
