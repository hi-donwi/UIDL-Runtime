import 'dart:convert';
import '../model/document.dart';
import '../spec/errors.dart';
import '../validation/version_guard.dart';

class UidlParser {
  static UidlDocument parse(dynamic input) {
    Map<String, dynamic> map;

    if (input is String) {
      try {
        final decoded = jsonDecode(input);
        if (decoded is! Map<String, dynamic>) {
          throw UidlException(
            code: UidlErrorCodes.invalidDocument,
            message: 'UIDL document root must be a JSON object',
          );
        }
        map = decoded;
      } on FormatException catch (e) {
        throw UidlException(
          code: UidlErrorCodes.invalidDocument,
          message: 'Malformed JSON input: ${e.message}',
        );
      }
    } else if (input is Map<String, dynamic>) {
      map = input;
    } else if (input is Map) {
      map = Map<String, dynamic>.from(input);
    } else {
      throw UidlException(
        code: UidlErrorCodes.invalidDocument,
        message: 'Expected String or Map, got ${input.runtimeType}',
      );
    }

    if (!map.containsKey('version')) {
      throw UidlException(
        code: UidlErrorCodes.invalidDocument,
        message: 'Missing required "version" field in UIDL document',
      );
    }

    assertSupportedDocumentVersion(map['version']);

    if (!map.containsKey('root') || map['root'] is! Map) {
      throw UidlException(
        code: UidlErrorCodes.invalidDocument,
        message: 'Missing or invalid "root" node in UIDL document',
      );
    }

    try {
      return UidlDocument.fromJson(map);
    } catch (e) {
      throw UidlException(
        code: UidlErrorCodes.invalidDocument,
        message: 'Failed to construct UidlDocument: $e',
      );
    }
  }
}
