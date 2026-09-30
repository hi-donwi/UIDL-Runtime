import 'package:flutter/material.dart';

/// Affine transformation widget supporting translation, scaling, and rotation.
class UidlTransform extends StatelessWidget {
  final double translateX;
  final double translateY;
  final double scale;
  final double? scaleX;
  final double? scaleY;
  final double rotation;
  final Alignment alignment;
  final Widget child;

  const UidlTransform({
    super.key,
    this.translateX = 0.0,
    this.translateY = 0.0,
    this.scale = 1.0,
    this.scaleX,
    this.scaleY,
    this.rotation = 0.0,
    this.alignment = Alignment.center,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveScaleX = scaleX ?? scale;
    final effectiveScaleY = scaleY ?? scale;

    final matrix = Matrix4.identity()
      ..setTranslationRaw(translateX, translateY, 0.0)
      ..scaleByDouble(effectiveScaleX, effectiveScaleY, 1.0, 1.0)
      ..rotateZ(rotation);

    return Transform(
      alignment: alignment,
      transform: matrix,
      child: child,
    );
  }
}

/// Interactive 2D drag and gesture surface that tracks relative or absolute coordinates.
class UidlDraggableLayer extends StatefulWidget {
  final double initialX;
  final double initialY;
  final String coordinateMode; // 'absolute' or 'normalized'
  final String lockAxis; // 'none', 'horizontal', 'vertical'
  final ValueChanged<Map<String, dynamic>>? onPanStart;
  final ValueChanged<Map<String, dynamic>>? onPanUpdate;
  final ValueChanged<Map<String, dynamic>>? onPanEnd;
  final Widget child;

  const UidlDraggableLayer({
    super.key,
    this.initialX = 0.0,
    this.initialY = 0.0,
    this.coordinateMode = 'absolute',
    this.lockAxis = 'none',
    this.onPanStart,
    this.onPanUpdate,
    this.onPanEnd,
    required this.child,
  });

  @override
  State<UidlDraggableLayer> createState() => _UidlDraggableLayerState();
}

class _UidlDraggableLayerState extends State<UidlDraggableLayer> {
  late double _x;
  late double _y;

  @override
  void initState() {
    super.initState();
    _x = widget.initialX;
    _y = widget.initialY;
  }

  @override
  void didUpdateWidget(covariant UidlDraggableLayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialX != oldWidget.initialX || widget.initialY != oldWidget.initialY) {
      _x = widget.initialX;
      _y = widget.initialY;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanStart: (details) {
        widget.onPanStart?.call({
          'x': _x,
          'y': _y,
          'globalX': details.globalPosition.dx,
          'globalY': details.globalPosition.dy,
        });
      },
      onPanUpdate: (details) {
        setState(() {
          if (widget.lockAxis != 'horizontal') {
            _y += details.delta.dy;
          }
          if (widget.lockAxis != 'vertical') {
            _x += details.delta.dx;
          }
        });

        widget.onPanUpdate?.call({
          'x': _x,
          'y': _y,
          'deltaX': details.delta.dx,
          'deltaY': details.delta.dy,
        });
      },
      onPanEnd: (details) {
        widget.onPanEnd?.call({
          'x': _x,
          'y': _y,
          'velocityX': details.velocity.pixelsPerSecond.dx,
          'velocityY': details.velocity.pixelsPerSecond.dy,
        });
      },
      child: Transform.translate(
        offset: Offset(_x, _y),
        child: widget.child,
      ),
    );
  }
}

/// Declarative video and live stream playback surface.
class UidlVideoPlayer extends StatefulWidget {
  final String src;
  final BoxFit fit;
  final bool autoplay;
  final bool muted;
  final bool loop;
  final bool showControls;
  final bool showLiveBadge;
  final String? title;
  final VoidCallback? onPlay;
  final VoidCallback? onPause;

  const UidlVideoPlayer({
    super.key,
    required this.src,
    this.fit = BoxFit.contain,
    this.autoplay = true,
    this.muted = false,
    this.loop = false,
    this.showControls = true,
    this.showLiveBadge = false,
    this.title,
    this.onPlay,
    this.onPause,
  });

  @override
  State<UidlVideoPlayer> createState() => _UidlVideoPlayerState();
}

class _UidlVideoPlayerState extends State<UidlVideoPlayer> {
  late bool _isPlaying;
  late bool _isMuted;

  @override
  void initState() {
    super.initState();
    _isPlaying = widget.autoplay;
    _isMuted = widget.muted;
  }

  void _togglePlay() {
    setState(() {
      _isPlaying = !_isPlaying;
    });
    if (_isPlaying) {
      widget.onPlay?.call();
    } else {
      widget.onPause?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        color: Colors.black,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Video placeholder / background surface
            Center(
              child: Icon(
                Icons.videocam_outlined,
                size: 48,
                color: Colors.white.withAlpha(80),
              ),
            ),

            // Top overlay: Live badge and Title
            Positioned(
              top: 12,
              left: 12,
              right: 12,
              child: Row(
                children: [
                  if (widget.showLiveBadge)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.fiber_manual_record, size: 10, color: Colors.white),
                          SizedBox(width: 4),
                          Text(
                            'LIVE',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (widget.title != null) ...[
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.title!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Center playback controls
            if (widget.showControls)
              IconButton(
                iconSize: 48,
                icon: Icon(
                  _isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled,
                  color: Colors.white.withAlpha(220),
                ),
                onPressed: _togglePlay,
              ),

            // Bottom control bar
            if (widget.showControls)
              Positioned(
                bottom: 8,
                left: 12,
                right: 12,
                child: Row(
                  children: [
                    IconButton(
                      iconSize: 20,
                      icon: Icon(
                        _isMuted ? Icons.volume_off : Icons.volume_up,
                        color: Colors.white,
                      ),
                      onPressed: () {
                        setState(() {
                          _isMuted = !_isMuted;
                        });
                      },
                    ),
                    const Expanded(
                      child: LinearProgressIndicator(
                        value: 0.35,
                        backgroundColor: Colors.white24,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.red),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Declarative Image Picker tile supporting gallery and camera acquisition.
class UidlImagePicker extends StatelessWidget {
  final String source; // 'camera' or 'gallery'
  final String label;
  final String? value;
  final bool readOnly;
  final ValueChanged<Map<String, dynamic>>? onPick;
  final VoidCallback? onClear;

  const UidlImagePicker({
    super.key,
    this.source = 'gallery',
    this.label = 'Select Image',
    this.value,
    this.readOnly = false,
    this.onPick,
    this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final hasValue = value != null && value!.isNotEmpty;

    if (hasValue) {
      return Container(
        height: 120,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade300),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            value!.startsWith('http')
                ? Image.network(value!, fit: BoxFit.cover)
                : Container(
                    color: Colors.grey.shade200,
                    child: Center(
                      child: Text(
                        value!,
                        style: const TextStyle(fontSize: 12),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
            if (!readOnly && onClear != null)
              Positioned(
                top: 4,
                right: 4,
                child: CircleAvatar(
                  radius: 14,
                  backgroundColor: Colors.black54,
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    iconSize: 16,
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: onClear,
                  ),
                ),
              ),
          ],
        ),
      );
    }

    return InkWell(
      onTap: readOnly
          ? null
          : () {
              onPick?.call({
                'source': source,
                'name': 'selected_image.jpg',
                'path': '/mock/path/selected_image.jpg',
                'size': 102400,
              });
            },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 100,
        decoration: BoxDecoration(
          border: Border.all(
            color: Colors.grey.shade400,
          ),
          borderRadius: BorderRadius.circular(8),
          color: Colors.grey.shade50,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              source == 'camera' ? Icons.camera_alt_outlined : Icons.photo_library_outlined,
              size: 32,
              color: Colors.grey.shade600,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
