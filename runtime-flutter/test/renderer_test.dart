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

    for (final type in ComponentRegistry.catalogWidgetTypes) {
      testWidgets('catalog type $type renders without unknown-widget fallback', (tester) async {
        final doc = UidlDocument(
          version: '1.0.0',
          id: 'catalog-$type',
          name: type,
          root: UidlNode(
            id: 'root',
            type: 'Column',
            children: [
              UidlNode(
                id: 'under_test',
                type: type,
                props: {
                  'value': 0,
                  'label': type,
                  'src': '',
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

        expect(find.textContaining('Unknown widget'), findsNothing);
        expect(ComponentRegistry().registeredTypes, contains(type));
      });
    }
  });

  group('data and overlay fidelity', () {
    testWidgets('DataTable paints column labels and row cells', (tester) async {
      final doc = UidlDocument(
        version: '1.0.0',
        id: 'table-screen',
        name: 'Table',
        root: UidlNode(
          id: 'table',
          type: 'DataTable',
          props: {
            'columns': [
              {'key': 'name', 'label': 'Name'},
              {'key': 'qty', 'label': 'Qty'},
            ],
            'rows': [
              {'name': 'Nails', 'qty': 12},
            ],
          },
        ),
      );

      await tester.pumpWidget(MaterialApp(home: Scaffold(body: UidlRenderer(document: doc))));
      expect(find.text('Name'), findsOneWidget);
      expect(find.text('Qty'), findsOneWidget);
      expect(find.text('Nails'), findsOneWidget);
      expect(find.text('12'), findsOneWidget);
    });

    testWidgets('Chart paints x labels from rows', (tester) async {
      final doc = UidlDocument(
        version: '1.0.0',
        id: 'chart-screen',
        name: 'Chart',
        root: UidlNode(
          id: 'chart',
          type: 'Chart',
          props: {
            'title': 'Sales',
            'xKey': 'month',
            'yKey': 'value',
            'rows': [
              {'month': 'Apr', 'value': 10},
              {'month': 'May', 'value': 20},
            ],
          },
        ),
      );

      await tester.pumpWidget(MaterialApp(home: Scaffold(body: UidlRenderer(document: doc))));
      expect(find.text('Sales'), findsOneWidget);
      expect(find.text('Apr'), findsOneWidget);
      expect(find.text('May'), findsOneWidget);
    });

    testWidgets('Dialog shows title when open', (tester) async {
      final doc = UidlDocument(
        version: '1.0.0',
        id: 'dialog-screen',
        name: 'Dialog',
        root: UidlNode(
          id: 'dlg',
          type: 'Dialog',
          props: {'open': true, 'title': 'Confirm', 'content': 'Delete this row?'},
        ),
      );

      await tester.pumpWidget(MaterialApp(home: Scaffold(body: UidlRenderer(document: doc))));
      expect(find.text('Confirm'), findsOneWidget);
      expect(find.text('Delete this row?'), findsOneWidget);
    });

    testWidgets('QRCode and Barcode show the encoded value', (tester) async {
      final doc = UidlDocument(
        version: '1.0.0',
        id: 'codes-screen',
        name: 'Codes',
        root: UidlNode(
          id: 'root',
          type: 'Column',
          children: [
            UidlNode(id: 'qr', type: 'QRCode', props: {'value': 'INV-1'}),
            UidlNode(id: 'bc', type: 'Barcode', props: {'value': '1234567890'}),
            UidlNode(id: 'dm', type: 'DataMatrix', props: {'value': 'DM-9'}),
          ],
        ),
      );

      await tester.pumpWidget(MaterialApp(home: Scaffold(body: UidlRenderer(document: doc))));
      expect(find.text('INV-1'), findsOneWidget);
      expect(find.text('1234567890'), findsOneWidget);
      expect(find.text('DM-9'), findsOneWidget);
    });
  });
}
