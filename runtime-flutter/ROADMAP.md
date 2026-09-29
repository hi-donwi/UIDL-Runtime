# uidl_flutter Roadmap — Advanced Layout, Interactive Canvas, and Media Subsystems

This roadmap defines the next architectural iterations for `uidl_flutter`, expanding the runtime from standard forms and dashboards to high-interactivity visual surfaces, responsive fluid layouts, and rich multimedia streaming.

All planned enhancements maintain 100% backward compatibility with existing UIDL v1.0 specifications and conformance test suites.

---

## 1. Core Input Reliability & State Stability

### 1.1 Stable Persistent Text Controllers
- **Problem**: When `TextField` recreates its `TextEditingController` on every state mutation or value change, the virtual keyboard drops focus and cursor position resets.
- **Specification**:
  - Implement a persistent, lifecycle-managed controller cache indexed by `node.id`.
  - Only update controller text from state if the new text differs from the active controller value (avoiding circular cursor resets).
  - Add optional `debounceMs` prop to reduce rapid state dispatches during fast typing.

---

## 2. Responsive Flow & Positioning Layout Primitives

### 2.1 `Wrap` Component
- **Props**: `direction` ('horizontal' | 'vertical'), `spacing` (double), `runSpacing` (double), `alignment` ('start' | 'center' | 'end' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly'), `crossAxisAlignment` ('start' | 'center' | 'end').
- **Capability**: Allows collections of chips, badges, and inline metrics to wrap cleanly onto new lines without triggering `RenderFlex` overflow errors on compact viewports.

### 2.2 `Positioned` Component (Inside `Stack`)
- **Props**: `top`, `bottom`, `left`, `right`, `width`, `height`.
- **Capability**: Enables absolute placement of UI overlays, floating status indicators, and background layers within a parent `Stack`.

### 2.3 `Expanded` & `Flexible` Components
- **Props**: `flex` (int, default 1), `fit` ('loose' | 'tight').
- **Capability**: Enables children within `Row` or `Column` to expand dynamically to fill remaining available screen space.

### 2.4 `AspectRatio` Component
- **Props**: `aspectRatio` (double, e.g., 0.5625 for 9:16 portrait media, 1.0 for square thumbnails, 1.777 for 16:9 widescreen).
- **Capability**: Enforces proportional scaling of media frames across diverse device aspect ratios.

### 2.5 `SafeArea` Component
- **Props**: `top` (bool), `bottom` (bool), `left` (bool), `right` (bool).
- **Capability**: Insets child content away from device notches, camera cutouts, and OS navigation gesture bars.

### 2.6 `RefreshIndicator` Component
- **Props**: `color` (string), `backgroundColor` (string).
- **Events**: `onRefresh` (dispatches an action sequence or API reload on pull-to-refresh).

---

## 3. Interactive Canvas & Gesture Subsystem

### 3.1 `InteractiveCanvas` / `DraggableLayer`
- **Purpose**: Declarative freeform positioning of overlays, stickers, banners, or card elements on top of a 2D surface.
- **Props**:
  - `coordinateMode`: `'normalized'` (0.0 to 1.0 / percentage `xPct`, `yPct`) or `'absolute'` (pixels).
  - `x`: double or `{ "$bind": "state.xPct" }`.
  - `y`: double or `{ "$bind": "state.yPct" }`.
  - `scale`: double or `{ "$bind": "state.scale" }`.
  - `lockAxis`: `'none'` | `'horizontal'` | `'vertical'`.
- **Events**:
  - `onPanStart`, `onPanUpdate`, `onPanEnd`: Payload `{ "x": double, "y": double, "deltaX": double, "deltaY": double }`.

### 3.2 `Transform` Component
- **Props**: `translateX` (double), `translateY` (double), `scale` (double), `rotation` (double, radians or degrees).
- **Capability**: Applies affine transformations to child widgets without affecting document layout flow.

---

## 4. Multimedia & Video Streaming Subsystems

### 4.1 `LiveStreamPlayer` / `VideoPlayer`
- **Purpose**: Embedded playback of live broadcast feeds (HLS, WebRTC, RTMP) and pre-recorded MP4/WebM video assets.
- **Props**:
  - `src`: URL string (HTTP, HTTPS, HLS `.m3u8`, WebRTC).
  - `fit`: `'cover'` | `'contain'` | `'fill'`.
  - `autoplay`: bool (default true).
  - `muted`: bool (default false).
  - `loop`: bool (default false).
  - `showControls`: bool (default false).
  - `showLiveBadge`: bool (default false).
- **Events**:
  - `onPlay`, `onPause`, `onBuffering`, `onError`, `onEnded`.

---

## 5. Rich Media Input Components

### 5.1 `ImagePicker` Component
- **Purpose**: Native platform image acquisition from camera or photo library.
- **Props**:
  - `source`: `'gallery'` | `'camera'`.
  - `maxWidth`: double.
  - `maxHeight`: double.
  - `imageQuality`: int (0–100).
  - `label`: string.
- **Events**:
  - `onPick`: Payload `{ "path": string, "name": string, "size": int, "base64": string? }` written directly into target state.

---

## 6. Action Dispatcher Extensions

### 6.1 `upload` Action Kind
- **Purpose**: Direct multi-part form upload of picked files or assets to an HTTP endpoint.
- **Payload**:
  - `url`: target endpoint.
  - `fieldName`: name of multipart field (default `'file'`).
  - `filePath`: reference to local file path from state.
  - `headers`: custom authentication headers.
  - `targetState`: state path to store the uploaded URL response.
  - `progressState`: state path to report 0–100 upload progress.

### 6.2 `subscribe` Action Kind (SSE / WebSockets)
- **Purpose**: Continuous event streaming for live metrics and messaging feeds without polling overhead.
- **Payload**:
  - `url`: stream endpoint.
  - `protocol`: `'sse'` | `'websocket'`.
  - `targetState`: array path in state to append incoming events.
