# uidl_flutter

Native Flutter runtime implementation for UIDL (Universal Interface Definition Language) documents, providing a native widget renderer and cross-platform semantic execution.

## Features

- **Document Parsing & Version Guard**: Parses raw JSON maps or strings into strongly typed `UidlDocument` and `UidlNode` trees, strictly enforcing UIDL spec versioning (`major.minor`).
- **Bounded Expression Language**: Canonical expression evaluator supporting arithmetic, comparison, logic, strings, arrays, and ternaries with a bounded recursion depth of 64 levels.
- **Scope & Binding Resolution**: Full support for `$bind` across `state.*`, `route.*`, `session.*`, and `data.*` scopes without platform leaks.
- **Native Widget Mapping**: Translates declarative UIDL node types into idiomatic Flutter widgets (37 types: DataTable, Chart, Dialog, Kanban, TreeView, QRCode, Barcode, etc.).
- **Action Dispatcher**: Native action execution for `sequence`, `if`, `setState`, `navigate`, `api`, `mutate`, `command`, `download`, `query`, `showSnackbar`, `showDialog`, `validate`.
- **API & Query Actions**: Built-in HTTP client and database query execution with result/error state management.
- **Theme Integration**: Convert UIDL themes to Flutter `ThemeData` and vice versa.
- **State Management**: `ChangeNotifier`-based state management with reactive UI updates.
- **Accessibility**: Semantic labels, tooltips, and ARIA support.
- **Animation**: Built-in `AnimatedSwitcher` support via `animation` prop.
- **100% Conformance Verified**: Executes the language-agnostic cross-platform test suite from `conformance/cases/**/*.json`.

## Getting Started

Add `uidl_flutter` to your `pubspec.yaml`:

```yaml
dependencies:
  uidl_flutter: ^0.1.5
```

## Usage

### Basic Rendering

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
        body: UidlRenderer(document: doc),
      ),
    );
  }
}
```

### API Action

```dart
UidlRenderer(
  document: doc,
  onApi: (url, method, body, headers) async {
    final response = await http.get(Uri.parse(url));
    return jsonDecode(response.body);
  },
);
```

### Query Action

```dart
UidlRenderer(
  document: doc,
  onQuery: (target, params) async {
    final results = await db.query(target, params);
    return results;
  },
);
```

### Theme Integration

```dart
final uidlTheme = {
  'primaryColor': '#2196F3',
  'secondaryColor': '#FF9800',
  'brightness': 'dark',
};

final flutterTheme = UidlThemeAdapter.toFlutterTheme(uidlTheme);

MaterialApp(
  theme: flutterTheme,
  home: UidlRenderer(document: doc),
);
```

### State Management

```dart
final state = UidlDocumentState(document: doc);

state.addListener(() {
  print('State changed: ${state.state}');
});

state.setState('counter', 42);
await state.executeAction({'setState': {'path': 'counter', 'value': 100}});
```

### Accessibility

```dart
{
  'id': 'submit',
  'type': 'Button',
  'props': {
    'label': 'Submit',
    'semanticLabel': 'Submit form',
    'tooltip': 'Click to submit',
  },
}
```

### Image Widget

```dart
// Network image
{'type': 'Image', 'props': {'src': 'https://example.com/photo.jpg'}}

// Asset image
{'type': 'Image', 'props': {'src': 'asset://assets/logo.png'}}

// Base64 image
{'type': 'Image', 'props': {'src': 'data:image/png;base64,...'}}
```

### Slider Widget

```dart
{'type': 'Slider', 'props': {'value': 50, 'min': 0, 'max': 100}}
```

### Icon Widget

```dart
{'type': 'Icon', 'props': {'name': 'home', 'size': 24, 'color': '#FF0000'}}
```

## Widget Catalog (37 types)

**Layout**: Column, Row, Container, Stack, Spacer, Divider, Form
**Display**: Text, Icon, Image, Badge, Button
**Input**: TextField, Checkbox, Switch, Slider, Select, Textarea, RadioGroup
**List**: ListView, GridView, DataTable
**Data**: Chart, KanbanBoard, TreeView
**Navigation**: Sidebar, Navbar, Toolbar, PageBar
**Overlay**: Drawer, Panel, Popover, Dialog, Snackbar
**Code**: QRCode, Barcode, DataMatrix

## Running Tests

```bash
flutter test
```

## Running Conformance Tests

The Flutter runtime executes the shared test suite in `conformance/cases/`:

```bash
flutter test
```
