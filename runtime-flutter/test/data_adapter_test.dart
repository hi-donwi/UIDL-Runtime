import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:uidl_flutter/uidl_flutter.dart';

void main() {
  group('InMemoryDataAdapter Tests', () {
    test('returns rows for matching target collection', () async {
      final adapter = InMemoryDataAdapter({
        'tasks': [
          {'id': '1', 'title': 'Task One'},
          {'id': '2', 'title': 'Task Two'},
        ],
      });

      final rows = await adapter.query('tasks', {});
      expect(rows.length, equals(2));
      expect(rows[0]['title'], equals('Task One'));
    });

    test('returns empty list for unknown collection', () async {
      final adapter = InMemoryDataAdapter();
      final rows = await adapter.query('unknown', {});
      expect(rows, isEmpty);
    });
  });

  group('HttpDataAdapter Tests', () {
    late HttpServer server;
    late String baseUrl;

    setUp(() async {
      server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      baseUrl = 'http://${server.address.host}:${server.port}';
    });

    tearDown(() async {
      await server.close(force: true);
    });

    test('queries HTTP endpoint and parses array response', () async {
      server.listen((HttpRequest request) async {
        expect(request.uri.path, equals('/query'));
        expect(request.method, equals('POST'));

        final body = await utf8.decoder.bind(request).join();
        final json = jsonDecode(body) as Map<String, dynamic>;
        expect(json['target'], equals('items'));

        request.response
          ..statusCode = HttpStatus.ok
          ..headers.contentType = ContentType.json
          ..write(jsonEncode([
            {'id': 'item-1', 'name': 'Widget A'},
          ]))
          ..close();
      });

      final adapter = HttpDataAdapter(baseUrl: baseUrl);
      final rows = await adapter.query('items', {'search': 'test'});
      expect(rows.length, equals(1));
      expect(rows[0]['name'], equals('Widget A'));
    });

    test('parses RFC 9457 Problem Details error into ProblemDetailsException', () async {
      server.listen((HttpRequest request) async {
        request.response
          ..statusCode = HttpStatus.badRequest
          ..headers.set('content-type', 'application/problem+json')
          ..write(jsonEncode({
            'type': 'https://example.com/probs/validation',
            'title': 'Validation Failed',
            'status': 400,
            'detail': 'Invalid input parameters',
            'invalidParams': [
              {'name': 'title', 'reason': 'Title is required'},
            ],
          }))
          ..close();
      });

      final adapter = HttpDataAdapter(baseUrl: baseUrl);
      try {
        await adapter.query('items', {});
        fail('Expected ProblemDetailsException was not thrown');
      } on ProblemDetailsException catch (e) {
        expect(e.statusCode, equals(400));
        expect(e.title, equals('Validation Failed'));
        expect(e.detail, equals('Invalid input parameters'));
        expect(e.invalidParams.length, equals(1));
        expect(e.invalidParams[0]['name'], equals('title'));
        expect(e.invalidParams[0]['reason'], equals('Title is required'));
      }
    });
  });
}
