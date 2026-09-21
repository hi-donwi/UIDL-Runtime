import 'package:meta/meta.dart';
import 'node.dart';

@immutable
class UidlDocument {
  final String version;
  final String id;
  final String name;
  final UidlNode root;
  final Map<String, dynamic> initialState;
  final Map<String, dynamic> dataSources;
  final Map<String, UidlNode> components;
  final Map<String, dynamic>? theme;
  final Map<String, dynamic>? metadata;

  const UidlDocument({
    required this.version,
    required this.id,
    required this.name,
    required this.root,
    this.initialState = const {},
    this.dataSources = const {},
    this.components = const {},
    this.theme,
    this.metadata,
  });

  factory UidlDocument.fromJson(Map<String, dynamic> json) {
    final rootJson = json['root'];
    if (rootJson is! Map<String, dynamic>) {
      throw const FormatException('UidlDocument missing or invalid "root" node');
    }

    final rawComponents = json['components'];
    final Map<String, UidlNode> parsedComponents = {};
    if (rawComponents is Map<String, dynamic>) {
      for (final entry in rawComponents.entries) {
        if (entry.value is Map<String, dynamic>) {
          parsedComponents[entry.key] = UidlNode.fromJson(entry.value as Map<String, dynamic>);
        }
      }
    }

    return UidlDocument(
      version: json['version'] as String? ?? '1.0',
      id: json['id'] as String? ?? 'untitled',
      name: json['name'] as String? ?? 'Untitled Document',
      root: UidlNode.fromJson(rootJson),
      initialState: json['initialState'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['initialState'] as Map)
          : const {},
      dataSources: json['dataSources'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['dataSources'] as Map)
          : const {},
      components: parsedComponents,
      theme: json['theme'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['theme'] as Map)
          : null,
      metadata: json['metadata'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : null,
    );
  }
}
