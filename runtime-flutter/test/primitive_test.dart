import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';
import 'package:uidl_flutter/widgets/primitive_widgets.dart';

void main() {
  group('UidlPositioned tests', () {
    testWidgets('inside Stack works without ParentDataWidget error', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Stack(
              children: [
                UidlPositioned(
                  top: 10,
                  left: 20,
                  child: Text('Positioned Inside Stack'),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Positioned Inside Stack'), findsOneWidget);
    });

    testWidgets('outside Stack falls back gracefully without crashing', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                UidlPositioned(
                  top: 10,
                  left: 20,
                  child: Text('Positioned Outside Stack'),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Positioned Outside Stack'), findsOneWidget);
    });
  });

  group('UidlExpanded and UidlFlexible tests', () {
    testWidgets('UidlExpanded inside Column expands without error', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                UidlExpanded(
                  flex: 2,
                  child: Text('Expanded in Column'),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Expanded in Column'), findsOneWidget);
    });

    testWidgets('UidlExpanded outside Flex falls back gracefully without crashing', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SizedBox(
              child: UidlExpanded(
                child: Text('Expanded in SizedBox'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Expanded in SizedBox'), findsOneWidget);
    });

    testWidgets('UidlFlexible inside Row works without error', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Row(
              children: [
                UidlFlexible(
                  child: Text('Flexible in Row'),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Flexible in Row'), findsOneWidget);
    });
  });

  group('UidlTextField tests', () {
    testWidgets('retains text and controller across rebuilds', (tester) async {
      String currentValue = 'Initial';

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              home: Scaffold(
                body: Column(
                  children: [
                    UidlTextField(
                      nodeId: 'test_input',
                      value: currentValue,
                      placeholder: 'Enter name',
                      onChanged: (val) {
                        setState(() {
                          currentValue = val;
                        });
                      },
                    ),
                    Text('Echo: $currentValue'),
                  ],
                ),
              ),
            );
          },
        ),
      );

      expect(find.text('Initial'), findsOneWidget);
      expect(find.text('Echo: Initial'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Updated text');
      await tester.pump();

      expect(find.text('Echo: Updated text'), findsOneWidget);
    });
  });

  group('UIDL Document layout primitives integration', () {
    testWidgets('renders Wrap, SafeArea, and RefreshIndicator correctly in document', (tester) async {
      bool refreshed = false;

      final doc = UidlDocument(
        version: '1.0.0',
        id: 'primitives-screen',
        name: 'Primitives Screen',
        root: UidlNode(
          id: 'root',
          type: 'SafeArea',
          children: [
            UidlNode(
              id: 'refresh',
              type: 'RefreshIndicator',
              events: {
                'onRefresh': {
                  'action': 'custom',
                },
              },
              children: const [
                UidlNode(
                  id: 'wrap_container',
                  type: 'Wrap',
                  props: {
                    'spacing': 8.0,
                    'runSpacing': 4.0,
                  },
                  children: [
                    UidlNode(id: 'item1', type: 'Text', props: {'value': 'Tag 1'}),
                    UidlNode(id: 'item2', type: 'Text', props: {'value': 'Tag 2'}),
                  ],
                ),
              ],
            ),
          ],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: UidlRenderer(
              document: doc,
              onCommand: (action, payload) async {
                refreshed = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('Tag 1'), findsOneWidget);
      expect(find.text('Tag 2'), findsOneWidget);
      expect(find.byType(SafeArea), findsWidgets);
      expect(find.byType(Wrap), findsOneWidget);
      expect(find.byType(RefreshIndicator), findsOneWidget);
      expect(refreshed, isFalse);
    });
  });
}
