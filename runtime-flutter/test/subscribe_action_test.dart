import 'dart:async';

import 'package:flutter/material.dart' hide ActionDispatcher;
import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('ActionDispatcher subscribe action', () {
    test('subscribes to stream and updates state in replace mode', () async {
      final state = <String, dynamic>{};
      final scope = <String, dynamic>{'state': state};
      final controller = StreamController<dynamic>();
      int stateChangedCount = 0;

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onSubscribe: (url, {protocol, topic, headers, params}) {
          expect(url, equals('/api/live/metrics'));
          expect(protocol, equals('sse'));
          return controller.stream;
        },
        onStateChanged: () => stateChangedCount++,
      );

      await dispatcher.execute({
        'subscribe': {
          'url': '/api/live/metrics',
          'protocol': 'sse',
          'targetState': 'state.metrics',
          'mode': 'replace',
        },
      });

      expect(dispatcher.isSubscribed('/api/live/metrics'), isTrue);

      controller.add({'viewers': 150, 'likes': 3200});
      await pumpEventQueue();

      expect(state['metrics'], equals({'viewers': 150, 'likes': 3200}));
      expect(stateChangedCount, equals(1));

      controller.add({'viewers': 185, 'likes': 3550});
      await pumpEventQueue();

      expect(state['metrics'], equals({'viewers': 185, 'likes': 3550}));
      expect(stateChangedCount, equals(2));

      await dispatcher.cancelSubscription('/api/live/metrics');
      expect(dispatcher.isSubscribed('/api/live/metrics'), isFalse);
      await controller.close();
    });

    test('subscribes with mode append and maxItems limit', () async {
      final state = <String, dynamic>{'chatEvents': <dynamic>[]};
      final scope = <String, dynamic>{'state': state};
      final controller = StreamController<dynamic>();

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onSubscribe: (url, {protocol, topic, headers, params}) => controller.stream,
      );

      await dispatcher.execute({
        'subscribe': {
          'url': '/api/live/chat',
          'targetState': 'chatEvents',
          'mode': 'append',
          'maxItems': 3,
        },
      });

      for (int i = 1; i <= 5; i++) {
        controller.add({'id': i, 'text': 'Message $i'});
        await pumpEventQueue();
      }

      final events = state['chatEvents'] as List<dynamic>;
      expect(events.length, equals(3));
      expect(events[0]['id'], equals(3));
      expect(events[1]['id'], equals(4));
      expect(events[2]['id'], equals(5));

      await dispatcher.cancelAllSubscriptions();
      await controller.close();
    });

    test('subscribes with mode merge for dictionary patches', () async {
      final state = <String, dynamic>{
        'studio': {
          'status': 'live',
          'fps': 30,
        },
      };
      final scope = <String, dynamic>{'state': state};
      final controller = StreamController<dynamic>();

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onSubscribe: (url, {protocol, topic, headers, params}) => controller.stream,
      );

      await dispatcher.execute({
        'subscribe': {
          'url': '/api/live/studio-status',
          'targetState': 'studio',
          'mode': 'merge',
        },
      });

      controller.add({'bitrate': '4500kbps', 'fps': 60});
      await pumpEventQueue();

      expect(state['studio'], equals({
        'status': 'live',
        'fps': 60,
        'bitrate': '4500kbps',
      }));

      await dispatcher.cancelAllSubscriptions();
      await controller.close();
    });

    test('executes onData sub-action with eventPayload', () async {
      final state = <String, dynamic>{'lastCommentSender': ''};
      final scope = <String, dynamic>{'state': state};
      final controller = StreamController<dynamic>();

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onSubscribe: (url, {protocol, topic, headers, params}) => controller.stream,
      );

      await dispatcher.execute({
        'subscribe': {
          'url': '/api/live/comments',
          'onData': {
            'setState': {
              'path': 'lastCommentSender',
              'value': {r'$bind': 'event.sender'},
            },
          },
        },
      });

      controller.add({'sender': 'Andi', 'comment': 'Keren banget!'});
      await pumpEventQueue();

      expect(state['lastCommentSender'], equals('Andi'));

      await dispatcher.cancelAllSubscriptions();
      await controller.close();
    });

    test('handles stream onError with errorPath and onError sub-action', () async {
      final state = <String, dynamic>{};
      final scope = <String, dynamic>{'state': state};
      final controller = StreamController<dynamic>();

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onSubscribe: (url, {protocol, topic, headers, params}) => controller.stream,
      );

      await dispatcher.execute({
        'subscribe': {
          'url': '/api/live/stream',
          'errorPath': 'state.streamError',
          'onError': {
            'setState': {
              'path': 'hasStreamError',
              'value': true,
            },
          },
        },
      });

      controller.addError(Exception('Connection lost'));
      await pumpEventQueue();

      expect(state['streamError'], isNotNull);
      expect(state['streamError']['error'], contains('Connection lost'));
      expect(state['hasStreamError'], isTrue);

      await dispatcher.cancelAllSubscriptions();
      await controller.close();
    });

    test('rejects targetState pointing to reserved \$data envelope', () async {
      final state = <String, dynamic>{};
      final dispatcher = ActionDispatcher(state: state, scope: {'state': state});

      await expectLater(
        dispatcher.execute({
          'subscribe': {
            'url': '/api/live/data',
            'targetState': r'$data.metrics',
          },
        }),
        throwsA(
          isA<UidlException>().having(
            (e) => e.code,
            'code',
            UidlErrorCodes.invalidState,
          ),
        ),
      );
    });

    test('fails closed when onSubscribe is not provided', () async {
      final state = <String, dynamic>{};
      final dispatcher = ActionDispatcher(state: state, scope: {'state': state});

      await dispatcher.execute({
        'subscribe': {
          'url': '/api/live/stream',
          'errorPath': 'state.streamError',
        },
      });

      expect(state['streamError'], equals({'error': 'Subscription handler not configured'}));
    });

    test('cancels existing subscription when resubscribing with same id', () async {
      final state = <String, dynamic>{};
      final scope = <String, dynamic>{'state': state};
      final controller1 = StreamController<dynamic>();
      final controller2 = StreamController<dynamic>();
      int subCall = 0;

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onSubscribe: (url, {protocol, topic, headers, params}) {
          subCall++;
          return subCall == 1 ? controller1.stream : controller2.stream;
        },
      );

      await dispatcher.execute({
        'subscribe': {
          'id': 'metrics_feed',
          'url': '/api/live/metrics',
          'targetState': 'val',
        },
      });

      expect(dispatcher.isSubscribed('metrics_feed'), isTrue);

      // Re-subscribe with same id
      await dispatcher.execute({
        'subscribe': {
          'id': 'metrics_feed',
          'url': '/api/live/metrics_v2',
          'targetState': 'val',
        },
      });

      controller1.add('from_1');
      await pumpEventQueue();
      expect(state['val'], isNull); // controller1 should be cancelled and not write

      controller2.add('from_2');
      await pumpEventQueue();
      expect(state['val'], equals('from_2'));

      await dispatcher.cancelAllSubscriptions();
      await controller1.close();
      await controller2.close();
    });

    test('unsubscribes via explicit unsubscribe action and callback', () async {
      final state = <String, dynamic>{};
      final scope = <String, dynamic>{'state': state};
      final controller = StreamController<dynamic>();
      String? unsubscribedId;

      final dispatcher = ActionDispatcher(
        state: state,
        scope: scope,
        onSubscribe: (url, {protocol, topic, headers, params}) => controller.stream,
        onUnsubscribe: (id) => unsubscribedId = id,
      );

      await dispatcher.execute({
        'subscribe': {
          'id': 'chat_sub',
          'url': '/api/live/chat',
        },
      });

      expect(dispatcher.isSubscribed('chat_sub'), isTrue);

      await dispatcher.execute({
        'unsubscribe': {
          'id': 'chat_sub',
        },
      });

      expect(dispatcher.isSubscribed('chat_sub'), isFalse);
      expect(unsubscribedId, equals('chat_sub'));

      await controller.close();
    });

    test('cancels all subscriptions on cancelAllSubscriptions and dispose', () async {
      final state = <String, dynamic>{};
      final controller1 = StreamController<dynamic>();
      final controller2 = StreamController<dynamic>();
      final unsubscribed = <String>[];

      final dispatcher = ActionDispatcher(
        state: state,
        scope: {'state': state},
        onSubscribe: (url, {protocol, topic, headers, params}) {
          if (url == 'url1') return controller1.stream;
          return controller2.stream;
        },
        onUnsubscribe: unsubscribed.add,
      );

      await dispatcher.execute({
        'subscribe': {'id': 's1', 'url': 'url1'},
      });
      await dispatcher.execute({
        'subscribe': {'id': 's2', 'url': 'url2'},
      });

      expect(dispatcher.activeSubscriptions.length, equals(2));

      await dispatcher.cancelAllSubscriptions();

      expect(dispatcher.activeSubscriptions.isEmpty, isTrue);
      expect(unsubscribed, containsAll(['s1', 's2']));

      await controller1.close();
      await controller2.close();
    });
  });

  group('UidlDocumentState and UidlRenderer streaming integration', () {
    test('UidlDocumentState exposes streaming helpers and disposes cleanly', () async {
      final controller = StreamController<dynamic>();
      const doc = UidlDocument(
        version: '1.0',
        id: 'test_doc',
        name: 'Test Doc',
        root: UidlNode(id: 'root', type: 'Container'),
        initialState: {'liveMetrics': {}},
      );

      final docState = UidlDocumentState(
        document: doc,
        onSubscribe: (url, {protocol, topic, headers, params}) => controller.stream,
      );

      await docState.executeAction({
        'subscribe': {
          'id': 'metrics_live',
          'url': '/stream',
          'targetState': 'liveMetrics',
        },
      });

      expect(docState.isSubscribed('metrics_live'), isTrue);

      controller.add({'viewers': 100});
      await pumpEventQueue();

      expect(docState.getState('liveMetrics'), equals({'viewers': 100}));

      docState.dispose();
      expect(docState.isSubscribed('metrics_live'), isFalse);
      await controller.close();
    });

    testWidgets('UidlRenderer renders live updates from real-time stream', (tester) async {
      final controller = StreamController<dynamic>();

      const doc = UidlDocument(
        version: '1.0',
        id: 'live_board',
        name: 'Live Board',
        initialState: {
          'liveCount': '0',
        },
        root: UidlNode(
          id: 'root',
          type: 'Column',
          children: [
            UidlNode(
              id: 'counter',
              type: 'Text',
              props: {
                'value': {r'$bind': 'state.liveCount'},
              },
            ),
            UidlNode(
              id: 'btn_sub',
              type: 'Button',
              props: {'label': 'Start Stream'},
              events: {
                'onClick': {
                  'subscribe': {
                    'url': '/api/live/counter',
                    'targetState': 'liveCount',
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
            body: UidlRenderer(
              document: doc,
              onSubscribe: (url, {protocol, topic, headers, params}) => controller.stream,
            ),
          ),
        ),
      );

      expect(find.text('0'), findsOneWidget);

      // Tap button to initiate subscription
      await tester.tap(find.text('Start Stream'));
      await tester.pumpAndSettle();

      // Emit first event
      controller.add('42');
      await tester.pumpAndSettle();
      expect(find.text('42'), findsOneWidget);

      // Emit second event
      controller.add('999');
      await tester.pumpAndSettle();
      expect(find.text('999'), findsOneWidget);

      await controller.close();
    });
  });
}
