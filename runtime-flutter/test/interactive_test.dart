import 'package:flutter/material.dart' hide ActionDispatcher;
import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';
import 'package:uidl_flutter/widgets/interactive_widgets.dart';

void main() {
  group('Interactive Widgets Tests', () {
    testWidgets('UidlTransform renders with translation and scale', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: UidlTransform(
              translateX: 20.0,
              translateY: 30.0,
              scale: 1.5,
              rotation: 0.1,
              child: Text('Transformed Item'),
            ),
          ),
        ),
      );

      expect(find.text('Transformed Item'), findsOneWidget);
      expect(find.byType(Transform), findsWidgets);
    });

    testWidgets('UidlDraggableLayer updates offset and fires onPanUpdate', (tester) async {
      Map<String, dynamic>? lastPan;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: UidlDraggableLayer(
              initialX: 10,
              initialY: 10,
              onPanUpdate: (payload) {
                lastPan = payload;
              },
              child: const SizedBox(
                width: 100,
                height: 100,
                child: Text('Draggable Card'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Draggable Card'), findsOneWidget);

      await tester.drag(find.text('Draggable Card'), const Offset(50, 40));
      await tester.pump();

      expect(lastPan, isNotNull);
      expect(lastPan!['x'], greaterThan(10));
      expect(lastPan!['y'], greaterThan(10));
    });

    testWidgets('UidlVideoPlayer renders live badge and toggles play/pause controls', (tester) async {
      bool paused = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: UidlVideoPlayer(
              src: 'https://example.com/stream.m3u8',
              title: 'Live Stream Broadcast',
              showLiveBadge: true,
              onPause: () {
                paused = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('LIVE'), findsOneWidget);
      expect(find.text('Live Stream Broadcast'), findsOneWidget);
      expect(find.byIcon(Icons.pause_circle_filled), findsOneWidget);

      await tester.tap(find.byIcon(Icons.pause_circle_filled));
      await tester.pump();

      expect(paused, isTrue);
      expect(find.byIcon(Icons.play_circle_filled), findsOneWidget);
    });

    testWidgets('UidlImagePicker renders gallery picker and triggers onPick', (tester) async {
      Map<String, dynamic>? pickedData;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: UidlImagePicker(
              source: 'camera',
              label: 'Take Product Photo',
              onPick: (data) {
                pickedData = data;
              },
            ),
          ),
        ),
      );

      expect(find.text('Take Product Photo'), findsOneWidget);
      expect(find.byIcon(Icons.camera_alt_outlined), findsOneWidget);

      await tester.tap(find.text('Take Product Photo'));
      await tester.pump();

      expect(pickedData, isNotNull);
      expect(pickedData!['source'], equals('camera'));
    });
  });

  group('ActionDispatcher Mobile Actions Tests', () {
    test('executes confirm action with then/else branches', () async {
      final state = <String, dynamic>{'confirmed': false};
      final scope = <String, dynamic>{'state': state};

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onConfirm: (title, message, confirmLabel, cancelLabel) async => true,
      );

      await dispatcher.execute({
        'confirm': {
          'title': 'Delete Item',
          'message': 'Are you sure?',
          'then': {
            'setState': {
              'path': 'confirmed',
              'value': {'literal': true},
            },
          },
        },
      });

      expect(state['confirmed'], isTrue);
    });

    test('executes upload action and updates target state path', () async {
      final state = <String, dynamic>{};
      final scope = <String, dynamic>{'state': state};

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onUpload: (url, filePath, fieldName, headers) async {
          return {
            'url': 'https://cdn.example.com/uploads/photo.jpg',
            'status': 'success',
          };
        },
      );

      await dispatcher.execute({
        'upload': {
          'url': 'https://api.example.com/upload',
          'filePath': '/tmp/photo.jpg',
          'resultPath': 'state.uploadResult',
        },
      });

      expect(state['uploadResult'], isNotNull);
      expect(state['uploadResult']['url'], equals('https://cdn.example.com/uploads/photo.jpg'));
    });

    test('executes copyToClipboard action', () async {
      String? copied;
      final state = <String, dynamic>{};
      final scope = <String, dynamic>{'state': state};

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onClipboard: (text) async {
          copied = text;
        },
      );

      await dispatcher.execute({
        'copyToClipboard': {
          'text': {'literal': 'https://example.com/live/123'},
        },
      });

      expect(copied, equals('https://example.com/live/123'));
    });
  });

  group('UIDL Document Integration Tests for Sprint U2', () {
    testWidgets('renders document containing Transform, VideoPlayer, and ImagePicker', (tester) async {
      const doc = UidlDocument(
        version: '1.0.0',
        id: 'media-screen',
        name: 'Media Screen',
        root: const UidlNode(
          id: 'root',
          type: 'Column',
          children: [
            UidlNode(
              id: 'video',
              type: 'VideoPlayer',
              props: {
                'src': 'https://example.com/stream.m3u8',
                'title': 'Feature Stream',
                'showLiveBadge': true,
              },
            ),
            UidlNode(
              id: 'transformed_layer',
              type: 'Transform',
              props: {
                'scale': 1.1,
              },
              children: [
                UidlNode(
                  id: 'picker',
                  type: 'ImagePicker',
                  props: {
                    'label': 'Upload Cover Image',
                  },
                ),
              ],
            ),
          ],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: UidlRenderer(document: doc),
          ),
        ),
      );

      expect(find.text('Feature Stream'), findsOneWidget);
      expect(find.text('LIVE'), findsOneWidget);
      expect(find.text('Upload Cover Image'), findsOneWidget);
    });
  });
}
