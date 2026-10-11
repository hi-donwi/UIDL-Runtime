import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Stream-based Server-Sent Events (SSE) adapter for real-time document synchronization.
class SseStreamAdapter {
  final HttpClient _client;

  SseStreamAdapter({HttpClient? client}) : _client = client ?? HttpClient();

  /// Subscribes to an SSE endpoint and yields parsed event maps.
  Stream<Map<String, dynamic>> subscribe(
    String url, {
    Map<String, String>? headers,
  }) {
    final controller = StreamController<Map<String, dynamic>>();

    () async {
      try {
        final uri = Uri.parse(url);
        final request = await _client.getUrl(uri);
        request.headers.set(HttpHeaders.acceptHeader, 'text/event-stream');
        request.headers.set(HttpHeaders.cacheControlHeader, 'no-cache');

        if (headers != null) {
          headers.forEach((k, v) => request.headers.set(k, v));
        }

        final response = await request.close();
        if (response.statusCode != 200) {
          controller.addError(
            Exception('SSE connection failed with HTTP status ${response.statusCode}'),
          );
          await controller.close();
          return;
        }

        String buffer = '';
        final subscription = response
            .transform(utf8.decoder)
            .listen(
              (chunk) {
                buffer += chunk;
                while (buffer.contains('\n\n')) {
                  final boundaryIndex = buffer.indexOf('\n\n');
                  final frame = buffer.substring(0, boundaryIndex);
                  buffer = buffer.substring(boundaryIndex + 2);

                  final lines = frame.split('\n');
                  for (final line in lines) {
                    final trimmed = line.trim();
                    if (trimmed.startsWith('data:')) {
                      final dataStr = trimmed.substring(5).trim();
                      try {
                        final parsed = jsonDecode(dataStr);
                        if (parsed is Map<String, dynamic>) {
                          controller.add(parsed);
                        } else {
                          controller.add({'data': parsed});
                        }
                      } catch (_) {
                        // ignore keep-alive frames
                      }
                    }
                  }
                }
              },
              onError: (err) {
                if (!controller.isClosed) {
                  controller.addError(err);
                  controller.close();
                }
              },
              onDone: () {
                if (!controller.isClosed) {
                  controller.close();
                }
              },
              cancelOnError: true,
            );

        controller.onCancel = () {
          subscription.cancel();
        };
      } catch (e) {
        if (!controller.isClosed) {
          controller.addError(e);
          controller.close();
        }
      }
    }();

    return controller.stream;
  }
}
