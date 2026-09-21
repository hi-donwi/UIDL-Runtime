import '../spec/constants.dart';
import '../spec/errors.dart';

class DocumentVersionReport {
  final bool isSupported;
  final int? major;
  final int? minor;
  final dynamic raw;

  DocumentVersionReport({
    required this.isSupported,
    this.major,
    this.minor,
    required this.raw,
  });
}

DocumentVersionReport reportDocumentVersion(dynamic version) {
  if (version is! String) {
    return DocumentVersionReport(isSupported: false, raw: version);
  }

  final match = documentVersionPattern.firstMatch(version);
  if (match == null) {
    return DocumentVersionReport(isSupported: false, raw: version);
  }

  final major = int.tryParse(match.group(1) ?? '');
  final minor = int.tryParse(match.group(2) ?? '');
  final supportedMajor = int.parse(uidlSpecVersion.split('.').first);

  if (major == null || minor == null || major != supportedMajor) {
    return DocumentVersionReport(
      isSupported: false,
      major: major,
      minor: minor,
      raw: version,
    );
  }

  return DocumentVersionReport(
    isSupported: true,
    major: major,
    minor: minor,
    raw: version,
  );
}

DocumentVersionReport assertSupportedDocumentVersion(dynamic version) {
  if (version is! String) {
    throw DocumentVersionException(
      code: UidlErrorCodes.malformedVersion,
      message: 'Document version "$version" is malformed; expected major.minor like "$uidlSpecVersion"',
      rawVersion: version?.toString() ?? 'null',
    );
  }

  final match = documentVersionPattern.firstMatch(version);
  if (match == null) {
    throw DocumentVersionException(
      code: UidlErrorCodes.malformedVersion,
      message: 'Document version "$version" is malformed; expected major.minor like "$uidlSpecVersion"',
      rawVersion: version,
    );
  }

  final major = int.tryParse(match.group(1) ?? '');
  final minor = int.tryParse(match.group(2) ?? '');
  final supportedMajor = int.parse(uidlSpecVersion.split('.').first);

  if (major == null || major != supportedMajor) {
    throw DocumentVersionException(
      code: UidlErrorCodes.unsupportedVersion,
      message: 'Document version "$version" has major $major; this runtime implements UIDL spec $uidlSpecVersion',
      rawVersion: version,
      major: major,
      minor: minor,
    );
  }

  return DocumentVersionReport(
    isSupported: true,
    major: major,
    minor: minor,
    raw: version,
  );
}
