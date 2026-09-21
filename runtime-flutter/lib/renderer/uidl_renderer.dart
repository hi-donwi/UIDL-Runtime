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
  final ApiHandler? onApi;
  final QueryHandler? onQuery;
  final ThemeData? theme;

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
    this.onApi,
    this.onQuery,
    this.theme,
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
          onApi: widget.onApi,
          onQuery: widget.onQuery,
          onStateChanged: () {
            if (mounted) setState(() {});
          },
        );
  }

  @override
  Widget build(BuildContext context) {
    Widget child = _renderNode(widget.document.root, _context.scope);

    if (widget.theme != null) {
      child = Theme(data: widget.theme!, child: child);
    }

    return child;
  }

  Widget _renderNode(UidlNode node, Map<String, dynamic> localScope) {
    if (node.visibility != null && node.visibility!.condition != null) {
      final isVisible = ExpressionEvaluator.evaluateCondition(
        node.visibility!.condition,
        localScope,
      );
      if (!isVisible) {
        return const SizedBox.shrink();
      }
    }

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

    final renderedChildren = node.children
        .map((child) => _renderNode(child, localScope))
        .toList();

    final builder = _context.registry.get(node.type);
    if (builder == null) {
      return Container(
        key: ValueKey(node.id),
        padding: const EdgeInsets.all(8),
        color: Colors.red.withAlpha(50),
        child: Text('[Unknown widget: ${node.type}]'),
      );
    }

    Widget rendered = builder(
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

    final semanticLabel = resolvedProps['semanticLabel']?.toString() ??
        resolvedProps['ariaLabel']?.toString();
    if (semanticLabel != null) {
      rendered = Semantics(
        label: semanticLabel,
        child: rendered,
      );
    }

    final tooltip = resolvedProps['tooltip']?.toString();
    if (tooltip != null) {
      rendered = Tooltip(
        message: tooltip,
        child: rendered,
      );
    }

    final animationType = resolvedProps['animation']?.toString();
    if (animationType != null) {
      rendered = AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: rendered,
      );
    }

    return rendered;
  }
}
