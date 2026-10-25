# Polyglot Backend Integration with UIDL-Runtime

UIDL documents describe **pure user interfaces** (layout, state, bindings, queries, actions) without embedding HTTP clients, database drivers, or business logic.

Because the runtime talks through a single data boundary (`DataAdapter`), **the backend can be implemented in any programming language** (Go, Python, Rust, Node.js, Java) and switched at will without modifying the UI documents.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   UIDL Document                        │
│          (home.uidl.json / task-list.uidl.json)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
               ┌────────────────────────┐
               │      UIDL Runtime      │
               │   (React / Flutter)    │
               └────────────┬───────────┘
                            │
               ┌────────────▼───────────┐
               │      DataAdapter       │
               │  (Universal Bridge)    │
               └────────────┬───────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
     [ Go Backend ]  [ Python Backend ] [ Rust Backend ]
     (net/http/chi)     (FastAPI)           (Axum)
```

---

## 1. Connecting React (`uidl-runtime`) to Any Backend

### Using `@kerangka/uidl` Adapter (Recommended)

When models are compiled with Kerangka, use the official `@kerangka/uidl` bridge:

```tsx
import React from "react";
import { UIDocumentRenderer, meridianLightTheme } from "uidl-runtime";
import { createKerangkaDataAdapter, createKerangkaMutationHandler } from "@kerangka/uidl";
import screenDoc from "./screens/task-list.uidl.json";

// Configure backend URL (can point to Go, Python, Rust, or Node)
const BACKEND_URL = process.env.VITE_API_URL || "http://localhost:8080";

const dataAdapter = createKerangkaDataAdapter({
  baseUrl: BACKEND_URL,
  getHeaders: () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  }),
});

const mutationHandler = createKerangkaMutationHandler({
  baseUrl: BACKEND_URL,
  getHeaders: () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  }),
});

export function App() {
  return (
    <UIDocumentRenderer
      document={screenDoc as any}
      theme={meridianLightTheme}
      dataAdapter={dataAdapter}
      onMutation={mutationHandler}
    />
  );
}
```

### Switching Backends

To switch from a **Python FastAPI** service to a **Go** or **Rust** service:
1. Update `BACKEND_URL` from port `8000` to port `8080`.
2. The UI remains 100% functional without rebuilding or modifying page files.

---

## 2. Connecting Flutter (`uidl_flutter`) to Any Backend

```dart
import 'package:flutter/material.dart';
import 'package:uidl_flutter/uidl_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class PolyglotDataAdapter implements DataAdapter {
  final String baseUrl;

  PolyglotDataAdapter(this.baseUrl);

  @override
  Future<List<Map<String, dynamic>>> query(String target, Map<String, dynamic> params) async {
    final response = await http.get(Uri.parse('$baseUrl/api/$target'));
    if (response.statusCode == 200) {
      final List data = json.decode(response.body);
      return data.cast<Map<String, dynamic>>();
    }
    throw Exception('Failed to query $target: ${response.statusCode}');
  }
}

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: UidlScreenView(
          assetPath: 'assets/screens/task-list.uidl.json',
          dataAdapter: PolyglotDataAdapter('http://localhost:8080'),
        ),
      ),
    );
  }
}
```

---

## 3. Backend Error Semantics (RFC 9457)

All backends must format validation and refusal errors as RFC 9457 `application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Validation Failed",
  "status": 422,
  "code": "VALIDATION_FAILED",
  "invalidParams": [
    {
      "name": "title",
      "reason": "Title must be between 3 and 100 characters"
    }
  ]
}
```

When this envelope is returned by Go, Python, or Rust, `UIDocumentRenderer` automatically maps `invalidParams[].reason` directly to the corresponding form input field errors.
