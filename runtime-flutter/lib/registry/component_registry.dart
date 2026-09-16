import 'package:flutter/material.dart';
import '../model/node.dart';
import '../theme/theme_resolver.dart';
import '../widgets/data_widgets.dart';

typedef WidgetBuilderFn = Widget Function(
  BuildContext context,
  UidlNode node,
  Map<String, dynamic> props,
  List<Widget> children,
  void Function(String event, [dynamic payload]) onEvent,
);

class ComponentRegistry {
  /// React `defaultWidgets` types. Native registries must cover every name.
  static const List<String> catalogWidgetTypes = [
    'Container', 'Row', 'Column', 'Stack', 'Spacer', 'Divider',
    'Text', 'Icon', 'Image', 'Button', 'Badge',
    'TextField', 'Checkbox', 'Switch', 'Slider', 'Select', 'Textarea', 'RadioGroup', 'Form',
    'ListView', 'GridView', 'DataTable', 'PageBar', 'Chart', 'KanbanBoard', 'TreeView',
    'Sidebar', 'Navbar', 'Toolbar',
    'Drawer', 'Panel', 'Popover', 'Dialog', 'Snackbar',
    'QRCode', 'Barcode', 'DataMatrix',
  ];

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

  Set<String> get registeredTypes => _builders.keys.toSet();

  Widget _childColumn(List<Widget> children, {Key? key}) {
    if (children.isEmpty) return const SizedBox.shrink();
    if (children.length == 1) return children.first;
    return Column(key: key, crossAxisAlignment: CrossAxisAlignment.start, children: children);
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

    register('Stack', (context, node, props, children, onEvent) {
      return Stack(key: ValueKey(node.id), children: children);
    });

    register('Icon', (context, node, props, children, onEvent) {
      return Icon(Icons.widgets, key: ValueKey(node.id));
    });

    register('Badge', (context, node, props, children, onEvent) {
      final label = props['value']?.toString() ?? props['label']?.toString() ?? '';
      return Badge(
        key: ValueKey(node.id),
        label: label.isEmpty ? null : Text(label),
        child: children.isEmpty ? const SizedBox.shrink() : children.first,
      );
    });

    register('Checkbox', (context, node, props, children, onEvent) {
      return Checkbox(
        key: ValueKey(node.id),
        value: props['value'] == true,
        onChanged: (value) => onEvent('onChange', value),
      );
    });

    register('Switch', (context, node, props, children, onEvent) {
      return Switch(
        key: ValueKey(node.id),
        value: props['value'] == true,
        onChanged: (value) => onEvent('onChange', value),
      );
    });

    register('Slider', (context, node, props, children, onEvent) {
      final raw = props['value'];
      final value = raw is num ? raw.toDouble().clamp(0.0, 1.0).toDouble() : 0.0;
      return Slider(
        key: ValueKey(node.id),
        value: value,
        onChanged: (v) => onEvent('onChange', v),
      );
    });

    register('Select', (context, node, props, children, onEvent) {
      final options = (props['options'] as List?) ?? const [];
      final items = options.whereType<Map>().map((option) {
        final value = option['value']?.toString() ?? '';
        final label = option['label']?.toString() ?? value;
        return DropdownMenuItem<String>(value: value, child: Text(label));
      }).toList();
      final selected = props['value']?.toString();
      final hasSelected = items.any((item) => item.value == selected);
      return DropdownButton<String>(
        key: ValueKey(node.id),
        value: hasSelected ? selected : null,
        items: items.isEmpty ? null : items,
        onChanged: (value) => onEvent('onChange', value),
      );
    });

    register('Textarea', (context, node, props, children, onEvent) {
      return TextField(
        key: ValueKey(node.id),
        controller: TextEditingController(text: props['value']?.toString() ?? ''),
        maxLines: 4,
        onChanged: (val) => onEvent('onChange', val),
      );
    });

    register('RadioGroup', (context, node, props, children, onEvent) {
      final groupValue = props['value']?.toString();
      final options = (props['options'] as List?) ?? const [];
      return Column(
        key: ValueKey(node.id),
        children: options.whereType<Map>().map((option) {
          final value = option['value']?.toString() ?? '';
          return RadioListTile<String>(
            title: Text(option['label']?.toString() ?? value),
            value: value,
            groupValue: groupValue,
            onChanged: (v) => onEvent('onChange', v),
          );
        }).toList(),
      );
    });

    register('Form', (context, node, props, children, onEvent) {
      return Form(key: ValueKey(node.id), child: _childColumn(children));
    });

    register('GridView', (context, node, props, children, onEvent) {
      return GridView.count(
        key: ValueKey(node.id),
        crossAxisCount: 2,
        shrinkWrap: true,
        children: children,
      );
    });

    register('DataTable', (context, node, props, children, onEvent) {
      return buildDataTable(id: node.id, props: props);
    });

    register('PageBar', (context, node, props, children, onEvent) {
      return Row(key: ValueKey(node.id), children: children);
    });

    register('Chart', (context, node, props, children, onEvent) {
      return buildChart(id: node.id, props: props);
    });

    register('KanbanBoard', (context, node, props, children, onEvent) {
      return buildKanban(id: node.id, props: props);
    });

    register('TreeView', (context, node, props, children, onEvent) {
      return buildTreeView(id: node.id, props: props);
    });

    register('Sidebar', (context, node, props, children, onEvent) {
      return _childColumn(children, key: ValueKey(node.id));
    });

    register('Navbar', (context, node, props, children, onEvent) {
      return Row(key: ValueKey(node.id), children: children);
    });

    register('Toolbar', (context, node, props, children, onEvent) {
      return Row(key: ValueKey(node.id), children: children);
    });

    register('Drawer', (context, node, props, children, onEvent) {
      return buildDrawer(id: node.id, props: props, children: children);
    });

    register('Panel', (context, node, props, children, onEvent) {
      return Card(key: ValueKey(node.id), child: _childColumn(children));
    });

    register('Popover', (context, node, props, children, onEvent) {
      return Material(key: ValueKey(node.id), child: _childColumn(children));
    });

    register('Dialog', (context, node, props, children, onEvent) {
      return buildDialog(id: node.id, props: props, children: children);
    });

    register('Snackbar', (context, node, props, children, onEvent) {
      final message = props['message']?.toString() ?? props['value']?.toString() ?? '';
      return Text(message, key: ValueKey(node.id));
    });

    register('QRCode', (context, node, props, children, onEvent) {
      return buildCodeMark(id: node.id, kind: 'QRCode', props: props);
    });
    register('Barcode', (context, node, props, children, onEvent) {
      return buildCodeMark(id: node.id, kind: 'Barcode', props: props);
    });
    register('DataMatrix', (context, node, props, children, onEvent) {
      return buildCodeMark(id: node.id, kind: 'DataMatrix', props: props);
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
