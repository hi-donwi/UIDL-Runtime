class UidlErrorCodes {
  static const String unsupportedVersion = 'UNSUPPORTED_VERSION';
  static const String malformedVersion = 'MALFORMED_VERSION';
  static const String invalidDocument = 'INVALID_DOCUMENT';
  static const String unknownAction = 'UNKNOWN_ACTION';
  static const String unknownComponent = 'UNKNOWN_COMPONENT';
  static const String evaluationError = 'EVALUATION_ERROR';
}

class UidlException implements Exception {
  final String code;
  final String message;
  final dynamic details;

  UidlException({
    required this.code,
    required this.message,
    this.details,
  });

  @override
  String toString() => '[uidl-runtime] $code: $message';
}

class DocumentVersionException extends UidlException {
  final String rawVersion;
  final int? major;
  final int? minor;

  DocumentVersionException({
    required super.code,
    required super.message,
    required this.rawVersion,
    this.major,
    this.minor,
    super.details,
  });
}
