## 0.2.0

* **Layout Primitives**: Added `Wrap`, `Positioned`, `Expanded`, `Flexible`, `AspectRatio`, `SafeArea`, and `RefreshIndicator` with defensive parent-context fallbacks.
* **Input Stability**: Persistent `TextEditingController` cache with stable cursor and focus retention during rapid state emissions.
* **Interactive Canvas**: Introduced `UidlTransform` (affine translation, scale, rotation) and `UidlDraggableLayer` / `UidlInteractiveCanvas` with 2D pan tracking.
* **Multimedia & Streaming**: Implemented `UidlVideoPlayer` with live stream badge indicator, overlay controls, and playback toggle.
* **Device & Media Pickers**: Implemented `UidlImagePicker` for camera and photo gallery asset selection with real-time preview and file state binding.
* **Extended Actions**: Added `upload` (multipart API upload), `confirm` (customizable modal dialogs), and `copyToClipboard` actions.
* **Quality Assurance**: 165/165 passing tests across component registry, parser, evaluation, and interactive integration suites.

## 0.1.5

* **API Action**: Full HTTP client integration with method, body, headers, and result/error state paths.
* **Query Action**: Database query execution with target, params, and result/error state paths.
* **Theme Integration**: `UidlThemeAdapter` to convert between UIDL themes and Flutter `ThemeData`.
* **State Management**: `UidlDocumentState` (ChangeNotifier) for reactive state with `getState`, `setState`, `executeAction`.
* **Accessibility**: `semanticLabel` and `tooltip` props for screen readers and tooltips.
* **Animation**: `animation` prop for `AnimatedSwitcher` transitions.
* **Icon Widget**: 150+ icon names mapped to Flutter `IconData` with `name`, `size`, `color` props.
* **Image Widget**: Support for network, asset (`asset://`), file (`file://`), and base64 (`data:image/`) images with `width`, `height`, `fit` props and error placeholder.
* **Slider Widget**: Configurable `min` and `max` props (default 0.0-1.0).
* **TextField Widget**: `obscureText`, `readOnly`, `enabled` props with improved state sync.
* **ListView Widget**: `shrinkWrap` and `scrollable` props for performance control.
* **@immutable annotations**: Models annotated for better static analysis.
* **Stricter lint rules**: 30+ additional lint rules in `analysis_options.yaml`.
* **Bug fixes**: Fixed `ThemeResolver.parseColor` crash with `Color(int)` in Dart 3.x.
* **Tests**: 134 tests passing including new API, Query, Theme, and State tests.

## 0.1.4

* First pub.dev release, version-aligned with npm `uidl-runtime` 0.1.4.
* Parse UIDL documents, evaluate expressions, resolve `$bind`, dispatch actions.
* Render the 37-type catalog to Flutter widgets (DataTable, Chart, Dialog, Kanban, TreeView, and code marks included).
* Reject document `setState` into the reserved `$data` envelope (`INVALID_STATE`).
