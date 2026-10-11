import 'dart:convert';
import 'dart:io';
import '../spec/errors.dart';
import 'data_source.dart';

class ProblemDetailsException extends UidlException {
  final int statusCode;
  final String? title;
  final String? detail;
  final List<Map<String, String>> invalidParams;

  ProblemDetailsException({
    required this.statusCode,
    this.title,
    this.detail,
    this.invalidParams = const [],
  }) : super(
          code: 'HTTP_$statusCode',
          message: detail ?? title ?? 'HTTP request failed with status $statusCode',
          details: invalidParams,
        );
}

class HttpDataAdapter implements DataAdapter {
  final String baseUrl;
  final Map<String, String> defaultHeaders;
  final Duration timeout;
  final HttpClient _client;

  HttpDataAdapter({
    required String baseUrl,
    this.defaultHeaders = const {},
    this.timeout = const Duration(seconds: 15),
    HttpClient? client,
  })  : baseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl,
        _client = client ?? HttpClient();

  @override
  Future<List<Map<String, dynamic>>> query(String target, Map<String, dynamic> params) async {
    final uri = Uri.parse('$baseUrl/query');
    final request = await _client.postUrl(uri).timeout(timeout);

    request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    for (final entry in defaultHeaders.entries) {
      request.headers.set(entry.key, entry.value);
    }

    final body = jsonEncode({
      'target': target,
      'params': params,
    });
    request.write(body);

    final response = await request.close().timeout(timeout);
    final responseBody = await response.transform(utf8.decoder).join();

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final decoded = jsonDecode(responseBody);
      if (decoded is List) {
        return decoded.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      } else if (decoded is Map && decoded['rows'] is List) {
        return (decoded['rows'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return const [];
    }

    // Parse RFC 9457 Problem Details if present
    try {
      final errorJson = jsonDecode(responseBody) as Map<String, dynamic>;
      final invalidParams = <Map<String, String>>[];
      if (errorJson['invalidParams'] is List) {
        for (final item in errorJson['invalidParams'] as List) {
          if (item is Map) {
            invalidParams.add({
              'name': item['name']?.toString() ?? '',
              'reason': item['reason']?.toString() ?? '',
            });
          }
        }
      }
      throw ProblemDetailsException(
        statusCode: response.statusCode,
        title: errorJson['title']?.toString(),
        detail: errorJson['detail']?.toString(),
        invalidParams: invalidParams,
      );
    } catch (e) {
      if (e is ProblemDetailsException) rethrow;
      throw UidlException(
        code: 'HTTP_${response.statusCode}',
        message: 'HTTP error ${response.statusCode}: $responseBody',
      );
    }
  }
}
