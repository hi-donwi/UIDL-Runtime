import 'package:flutter/material.dart';
import '../actions/action_dispatcher.dart';
import '../binding/binding_resolver.dart';
import '../data/data_source.dart';
import '../evaluator/expression_evaluator.dart';
import '../model/document.dart';
import '../model/node.dart';
import '../registry/component_registry.dart';
import 'render_context.dart';

class UidlRenderer extends StatefulWidget {
  final UidlDocument document;
  final UidlRenderContext? context;
  final Map<String, dynamic>? initialData;
  final Map<String, dynamic>? session;
  final Map<String, dynamic>? route;
  final ComponentRegistry? registry;
  final NavigationHandler? onNavigate;
  final SnackbarHandler? onSnackbar;
  final MutationHandler? onMutate;
  final CommandHandler? onCommand;
  final DownloadHandler? onDownload;

  const UidlRenderer({
    super.key,
    required this.document,
    this.context,
    this.initialData,
    this.session,
    this.route,
    this.registry,
    this.onNavigate,
    this.onSnackbar,
    this.onMutate,
    this.onCommand,
    this.onDownload,
  });

  @override
  State<UidlRenderer> createState() => _UidlRendererState();
}

class _UidlRendererState extends State<UidlRenderer> {
  late UidlRenderContext _context;

  @override
  void initState() {
    super.initState();
    _initContext();
  }

  void _initContext() {
    _context = widget.context ??
        UidlRenderContext.fromDocument(
          widget.document,
          initialData: widget.initialData,
          session: widget.session,
          route: widget.route,
          registry: widget.registry,
          onNavigate: widget.onNavigate,
          onSnackbar: widget.onSnackbar,
          onMutate: widget.onMutate,
          onCommand: widget.onCommand,
          onDownload: widget.onDownload,
          onStateChanged: () {
            if (mounted) setState(() {});
          },
        );
  }

  @override
  Widget build(BuildContext context) {
    return _renderNode(widget.document.root, _context.scope);
  }

  Widget _renderNode(UidlNode node, Map<String, dynamic> localScope) {
    // 1. Visibility check
    if (node.visibility != null && node.visibility!.condition != null) {
      final isVisible = ExpressionEvaluator.evaluateCondition(
        node.visibility!.condition,
        localScope,
      );
      if (!isVisible) {
        return const SizedBox.shrink();
      }
    }

    // 2. Repeat check
    if (node.repeat != null) {
      final items = DataSourceRunner.resolveDataSourceRows(
        node.repeat!.dataSource,
        localScope,
      );
      if (items is List && items.isNotEmpty) {
        final List<Widget> repeated = [];
        final itemKey = node.repeat!.asItem;
        final indexKey = node.repeat!.indexKey;

        for (int i = 0; i < items.length; i++) {
          final itemScope = Map<String, dynamic>.from(localScope);
          itemScope[itemKey] = items[i];
          if (indexKey != null) {
            itemScope[indexKey] = i;
          }
          final repeatedNode = UidlNode(
            id: '${node.id}_$i',
            type: node.type,
            componentId: node.componentId,
            props: node.props,
            style: node.style,
            events: node.events,
            children: node.children,
            slots: node.slots,
          );
          repeated.add(_renderNode(repeatedNode, itemScope));
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: repeated,
        );
      }
    }

    // 3. Resolve props
    final resolvedProps = <String, dynamic>{};
    for (final entry in node.props.entries) {
      final val = entry.value;
      if (val is Map && val.containsKey(r'$bind')) {
        resolvedProps[entry.key] = resolveBinding(val, localScope);
      } else if (val is Map && val.containsKey(r'$expr')) {
        resolvedProps[entry.key] = ExpressionEvaluator.evaluate(val, localScope);
      } else {
        resolvedProps[entry.key] = val;
      }
    }

    // 4. Render children
    final renderedChildren = node.children
        .map((child) => _renderNode(child, localScope))
        .toList();

    // 5. Look up builder in ComponentRegistry
    final builder = _context.registry.get(node.type);
    if (builder == null) {
      return Container(
        key: ValueKey(node.id),
        padding: const EdgeInsets.all(8),
        color: Colors.red.withAlpha(50),
        child: Text('[Unknown widget: ${node.type}]'),
      );
    }

    return builder(
      context,
      node,
      resolvedProps,
      renderedChildren,
      (event, [payload]) {
        if (node.events != null && node.events!.containsKey(event)) {
          final action = node.events![event];
          _context.dispatcher.execute(action, payload);
        }
      },
    );
  }
}
