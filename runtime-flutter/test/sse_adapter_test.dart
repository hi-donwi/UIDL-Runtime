import 'dart:async';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/data/sse_adapter.dart';

void main() {
  group('SseStreamAdapter', () {
    test('subscribes to SSE endpoint and streams parsed event objects', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final port = server.port;

      server.listen((HttpRequest request) async {
        request.response.headers.set('content-type', 'text/event-stream');
        request.response.headers.set('cache-control', 'no-cache');

        request.response.write('data: {"type": "create", "id": "1", "record": {"title": "Task 1"}}\n\n');
        await request.response.flush();

        request.response.write(': keep-alive\n\n');
        await request.response.flush();

        request.response.write('data: {"type": "update", "id": "1", "record": {"completed": true}}\n\n');
        await request.response.flush();

        await request.response.close();
      });

      final adapter = SseStreamAdapter();
      final stream = adapter.subscribe('http://127.0.0.1:$port/api/Task/events');

      final events = <Map<String, dynamic>>[];
      final completer = Completer<void>();

      stream.listen(
        (event) => events.add(event),
        onDone: () => completer.complete(),
        onError: (err) => completer.completeError(err),
      );

      await completer.future.timeout(const Duration(seconds: 5));
      await server.close();

      expect(events.length, equals(2));
      expect(events[0]['type'], equals('create'));
      expect(events[0]['id'], equals('1'));
      expect(events[0]['record']['title'], equals('Task 1'));

      expect(events[1]['type'], equals('update'));
      expect(events[1]['id'], equals('1'));
      expect(events[1]['record']['completed'], isTrue);
    });

    test('handles HTTP non-200 error gracefully', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final port = server.port;

      server.listen((HttpRequest request) async {
        request.response.statusCode = HttpStatus.notFound;
        await request.response.close();
      });

      final adapter = SseStreamAdapter();
      final stream = adapter.subscribe('http://127.0.0.1:$port/not-found');

      final completer = Completer<dynamic>();
      stream.listen(
        (_) {},
        onError: (err) => completer.complete(err),
      );

      final error = await completer.future.timeout(const Duration(seconds: 5));
      await server.close();

      expect(error.toString(), contains('404'));
    });
  });
}
