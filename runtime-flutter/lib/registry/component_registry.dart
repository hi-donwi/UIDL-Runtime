import 'package:flutter/material.dart';
import '../model/node.dart';
import '../theme/theme_resolver.dart';

typedef WidgetBuilderFn = Widget Function(
  BuildContext context,
  UidlNode node,
  Map<String, dynamic> props,
  List<Widget> children,
  void Function(String event, [dynamic payload]) onEvent,
);

class ComponentRegistry {
  final Map<String, WidgetBuilderFn> _builders = {};

  ComponentRegistry() {
    _registerDefaults();
  }

  void register(String type, WidgetBuilderFn builder) {
    _builders[type] = builder;
  }

  WidgetBuilderFn? get(String type) {
    return _builders[type];
  }

  void _registerDefaults() {
    register('Column', (context, node, props, children, onEvent) {
      final crossAxisAlignment = _parseCrossAxisAlignment(props['crossAxisAlignment']);
      final mainAxisAlignment = _parseMainAxisAlignment(props['mainAxisAlignment']);
      return Column(
        key: ValueKey(node.id),
        crossAxisAlignment: crossAxisAlignment,
        mainAxisAlignment: mainAxisAlignment,
        children: children,
      );
    });

    register('Row', (context, node, props, children, onEvent) {
      final crossAxisAlignment = _parseCrossAxisAlignment(props['crossAxisAlignment']);
      final mainAxisAlignment = _parseMainAxisAlignment(props['mainAxisAlignment']);
      return Row(
        key: ValueKey(node.id),
        crossAxisAlignment: crossAxisAlignment,
        mainAxisAlignment: mainAxisAlignment,
        children: children,
      );
    });

    register('Container', (context, node, props, children, onEvent) {
      final color = ThemeResolver.parseColor(props['backgroundColor'] ?? node.style?['backgroundColor']);
      final padding = ThemeResolver.parsePadding(props['padding'] ?? node.style?['padding']);
      final margin = ThemeResolver.parsePadding(props['margin'] ?? node.style?['margin']);

      return Container(
        key: ValueKey(node.id),
        color: color,
        padding: padding,
        margin: margin,
        child: children.isNotEmpty
            ? (children.length == 1 ? children.first : Column(children: children))
            : null,
      );
    });

    register('Text', (context, node, props, children, onEvent) {
      final value = props['value']?.toString() ?? props['text']?.toString() ?? '';
      final style = ThemeResolver.resolveTextStyle(node.style, context);
      return Text(
        value,
        key: ValueKey(node.id),
        style: style,
      );
    });

    register('Button', (context, node, props, children, onEvent) {
      final label = props['label']?.toString() ?? props['text']?.toString() ?? 'Button';
      return FilledButton(
        key: ValueKey(node.id),
        onPressed: () => onEvent('onClick'),
        child: Text(label),
      );
    });

    register('TextField', (context, node, props, children, onEvent) {
      final value = props['value']?.toString() ?? '';
      final placeholder = props['placeholder']?.toString() ?? props['label']?.toString();
      return TextField(
        key: ValueKey(node.id),
        controller: TextEditingController(text: value),
        decoration: InputDecoration(
          labelText: placeholder,
        ),
        onChanged: (val) => onEvent('onChange', val),
      );
    });

    register('Image', (context, node, props, children, onEvent) {
      final src = props['src']?.toString() ?? '';
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return Image.network(src, key: ValueKey(node.id));
      }
      return const SizedBox.shrink();
    });

    register('ListView', (context, node, props, children, onEvent) {
      return ListView(
        key: ValueKey(node.id),
        shrinkWrap: true,
        children: children,
      );
    });

    register('Spacer', (context, node, props, children, onEvent) {
      return const Spacer();
    });

    register('Divider', (context, node, props, children, onEvent) {
      return const Divider();
    });
  }

  static CrossAxisAlignment _parseCrossAxisAlignment(dynamic val) {
    switch (val?.toString().toLowerCase()) {
      case 'start':
      case 'left':
        return CrossAxisAlignment.start;
      case 'end':
      case 'right':
        return CrossAxisAlignment.end;
      case 'stretch':
        return CrossAxisAlignment.stretch;
      default:
        return CrossAxisAlignment.center;
    }
  }

  static MainAxisAlignment _parseMainAxisAlignment(dynamic val) {
    switch (val?.toString().toLowerCase()) {
      case 'start':
        return MainAxisAlignment.start;
      case 'end':
        return MainAxisAlignment.end;
      case 'spacebetween':
        return MainAxisAlignment.spaceBetween;
      case 'spacearound':
        return MainAxisAlignment.spaceAround;
      default:
        return MainAxisAlignment.start;
    }
  }
}
