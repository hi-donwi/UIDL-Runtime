import 'package:meta/meta.dart';
import '../spec/errors.dart';

@immutable
class UidlVisibility {
  final dynamic condition;

  const UidlVisibility({this.condition});

  factory UidlVisibility.fromJson(Map<String, dynamic> json) {
    return UidlVisibility(
      condition: json['condition'],
    );
  }
}

@immutable
class UidlRepeat {
  final dynamic dataSource;
  final String asItem;
  final String? indexKey;

  const UidlRepeat({
    required this.dataSource,
    this.asItem = 'item',
    this.indexKey,
  });

  factory UidlRepeat.fromJson(Map<String, dynamic> json) {
    return UidlRepeat(
      dataSource: json['dataSource'],
      asItem: json['as'] as String? ?? 'item',
      indexKey: json['index'] as String?,
    );
  }
}

@immutable
class UidlNode {
  final String id;
  final String type;
  final String? componentId;
  final Map<String, dynamic> props;
  final Map<String, dynamic>? style;
  final Map<String, dynamic>? events;
  final List<UidlNode> children;
  final Map<String, List<UidlNode>>? slots;
  final UidlVisibility? visibility;
  final UidlRepeat? repeat;
  final String? themeRef;
  final String? testId;

  const UidlNode({
    required this.id,
    required this.type,
    this.componentId,
    this.props = const {},
    this.style,
    this.events,
    this.children = const [],
    this.slots,
    this.visibility,
    this.repeat,
    this.themeRef,
    this.testId,
  });

  factory UidlNode.fromJson(Map<String, dynamic> json) {
    final rawChildren = json['children'];
    final List<UidlNode> parsedChildren = [];
    if (rawChildren is List) {
      for (final child in rawChildren) {
        if (child is Map<String, dynamic>) {
          parsedChildren.add(UidlNode.fromJson(child));
        }
      }
    }

    Map<String, List<UidlNode>>? parsedSlots;
    final rawSlots = json['slots'];
    if (rawSlots is Map<String, dynamic>) {
      parsedSlots = {};
      for (final entry in rawSlots.entries) {
        if (entry.value is List) {
          parsedSlots[entry.key] = (entry.value as List)
              .whereType<Map<String, dynamic>>()
              .map(UidlNode.fromJson)
              .toList();
        }
      }
    }

    final id = json['id'] as String?;
    final type = json['type'] as String?;
    final componentId = json['componentId'] as String?;

    if (id == null || (type == null && componentId == null)) {
      throw UidlException(
        code: UidlErrorCodes.invalidDocument,
        message: 'A UIDL node must have an "id" and either "type" or "componentId"',
      );
    }

    return UidlNode(
      id: id,
      type: type ?? 'Container',
      componentId: componentId,
      props: json['props'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['props'] as Map)
          : const {},
      style: json['style'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['style'] as Map)
          : null,
      events: json['events'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['events'] as Map)
          : null,
      children: parsedChildren,
      slots: parsedSlots,
      visibility: json['visibility'] is Map<String, dynamic>
          ? UidlVisibility.fromJson(json['visibility'] as Map<String, dynamic>)
          : null,
      repeat: json['repeat'] is Map<String, dynamic>
          ? UidlRepeat.fromJson(json['repeat'] as Map<String, dynamic>)
          : null,
      themeRef: json['themeRef'] as String?,
      testId: json['testId'] as String?,
    );
  }
}
