import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('ActionDispatcher setState', () {
    test('rejects document writes into the reserved \$data envelope', () async {
      final state = <String, dynamic>{'count': 0};
      final dispatcher = ActionDispatcher(state: state, scope: <String, dynamic>{});

      await expectLater(
        dispatcher.execute({
          'setState': {'path': r'$data.invoices.status', 'value': 'success'},
        }),
        throwsA(
          isA<UidlException>().having(
            (error) => error.code,
            'code',
            UidlErrorCodes.invalidState,
          ),
        ),
      );
      expect(state.containsKey(r'$data'), isFalse);
      expect(state['count'], 0);
    });

    test('still writes ordinary state paths', () async {
      final state = <String, dynamic>{'count': 0};
      final dispatcher = ActionDispatcher(state: state, scope: <String, dynamic>{});

      await dispatcher.execute({
        'setState': {'path': 'count', 'value': 2},
      });

      expect(state['count'], 2);
    });
  });

  group('ActionDispatcher api', () {
    test('calls onApi and stores result in state', () async {
      final state = <String, dynamic>{};
      final dispatcher = ActionDispatcher(
        state: state,
        scope: <String, dynamic>{},
        onApi: (url, method, body, headers) async {
          return {'name': 'test'};
        },
      );

      await dispatcher.execute({
        'api': {
          'url': '/api/user',
          'method': 'GET',
          'resultPath': 'state.user',
        },
      });

      expect(state['user'], {'name': 'test'});
    });

    test('handles api error with errorPath', () async {
      final state = <String, dynamic>{};
      final dispatcher = ActionDispatcher(
        state: state,
        scope: <String, dynamic>{},
        onApi: (url, method, body, headers) async {
          throw Exception('Network error');
        },
      );

      await dispatcher.execute({
        'api': {
          'url': '/api/user',
          'method': 'GET',
          'errorPath': 'state.apiError',
        },
      });

      expect(state['apiError'], isA<Map>());
      expect((state['apiError'] as Map)['error'], contains('Network error'));
    });
  });

  group('ActionDispatcher query', () {
    test('calls onQuery and stores result in state', () async {
      final state = <String, dynamic>{};
      final dispatcher = ActionDispatcher(
        state: state,
        scope: <String, dynamic>{},
        onQuery: (target, params) async {
          return [
            {'id': 1, 'name': 'Item 1'},
            {'id': 2, 'name': 'Item 2'},
          ];
        },
      );

      await dispatcher.execute({
        'query': {
          'target': 'invoices',
          'resultPath': 'state.invoices',
        },
      });

      expect(state['invoices'], isA<List>());
      expect((state['invoices'] as List).length, 2);
    });

    test('handles query error with errorPath', () async {
      final state = <String, dynamic>{};
      final dispatcher = ActionDispatcher(
        state: state,
        scope: <String, dynamic>{},
        onQuery: (target, params) async {
          throw Exception('Query failed');
        },
      );

      await dispatcher.execute({
        'query': {
          'target': 'invoices',
          'errorPath': 'state.queryError',
        },
      });

      expect(state['queryError'], isA<Map>());
      expect((state['queryError'] as Map)['error'], contains('Query failed'));
    });
  });

  group('UidlDocumentState', () {
    test('manages state and notifies listeners', () {
      final doc = UidlDocument(
        version: '1.0',
        id: 'test',
        name: 'Test',
        root: UidlNode(id: 'root', type: 'Container'),
        initialState: {'count': 0},
      );

      final docState = UidlDocumentState(document: doc);
      int notifyCount = 0;
      docState.addListener(() => notifyCount++);

      docState.setState('count', 5);
      expect(docState.getState('count'), 5);
      expect(notifyCount, 1);
    });

    test('executeAction triggers action dispatcher', () async {
      final doc = UidlDocument(
        version: '1.0',
        id: 'test',
        name: 'Test',
        root: UidlNode(id: 'root', type: 'Container'),
        initialState: {'count': 0},
      );

      final docState = UidlDocumentState(document: doc);

      await docState.executeAction({
        'setState': {'path': 'count', 'value': 10},
      });

      expect(docState.getState('count'), 10);
    });
  });
}
