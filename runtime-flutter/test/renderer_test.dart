import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('UidlRenderer Widget Tests', () {
    testWidgets('renders basic widget tree with Text and Button', (tester) async {
      final doc = UidlDocument(
        version: '1.0.0',
        id: 'basic-screen',
        name: 'Basic Screen',
        root: const UidlNode(
          id: 'root',
          type: 'Column',
          children: [
            UidlNode(
              id: 'title',
              type: 'Text',
              props: {'value': 'Welcome to UIDL Flutter'},
            ),
            UidlNode(
              id: 'btn',
              type: 'Button',
              props: {'label': 'Click Me'},
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

      expect(find.text('Welcome to UIDL Flutter'), findsOneWidget);
      expect(find.text('Click Me'), findsOneWidget);
    });

    testWidgets('updates live state on button click action', (tester) async {
      final doc = UidlDocument(
        version: '1.0.0',
        id: 'counter-screen',
        name: 'Counter Screen',
        initialState: {'counter': 0},
        root: const UidlNode(
          id: 'root',
          type: 'Column',
          children: [
            UidlNode(
              id: 'count_display',
              type: 'Text',
              props: {
                'value': {r'$bind': 'state.counter'},
              },
            ),
            UidlNode(
              id: 'inc_btn',
              type: 'Button',
              props: {'label': 'Increment'},
              events: {
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

      expect(find.text('0'), findsOneWidget);

      await tester.tap(find.text('Increment'));
      await tester.pumpAndSettle();

      expect(find.text('1'), findsOneWidget);

      await tester.tap(find.text('Increment'));
      await tester.pumpAndSettle();

      expect(find.text('2'), findsOneWidget);
    });

    testWidgets('respects visibility condition', (tester) async {
      final doc = UidlDocument(
        version: '1.0.0',
        id: 'visibility-screen',
        name: 'Visibility Screen',
        initialState: {'showSecret': false},
        root: const UidlNode(
          id: 'root',
          type: 'Column',
          children: [
            UidlNode(
              id: 'public_text',
              type: 'Text',
              props: {'value': 'Public Info'},
            ),
            UidlNode(
              id: 'secret_text',
              type: 'Text',
              props: {'value': 'Top Secret'},
              visibility: UidlVisibility(
                condition: {r'$bind': 'state.showSecret'},
              ),
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

      expect(find.text('Public Info'), findsOneWidget);
      expect(find.text('Top Secret'), findsNothing);
    });
  });
}
