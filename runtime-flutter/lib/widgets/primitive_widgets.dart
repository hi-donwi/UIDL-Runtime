import 'package:flutter/material.dart';

/// A stable, controlled text field that maintains its [TextEditingController]
/// across builds without dropping keyboard focus or resetting cursor position.
class UidlTextField extends StatefulWidget {
  final String nodeId;
  final String value;
  final String? placeholder;
  final bool obscureText;
  final bool readOnly;
  final bool enabled;
  final int maxLines;
  final void Function(String) onChanged;

  const UidlTextField({
    super.key,
    required this.nodeId,
    required this.value,
    this.placeholder,
    this.obscureText = false,
    this.readOnly = false,
    this.enabled = true,
    this.maxLines = 1,
    required this.onChanged,
  });

  @override
  State<UidlTextField> createState() => _UidlTextFieldState();
}

class _UidlTextFieldState extends State<UidlTextField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(covariant UidlTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _controller.text) {
      final oldSelection = _controller.selection;
      _controller.text = widget.value;
      if (oldSelection.isValid && oldSelection.end <= widget.value.length) {
        _controller.selection = oldSelection;
      } else {
        _controller.selection = TextSelection.collapsed(offset: widget.value.length);
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      decoration: InputDecoration(
        labelText: widget.placeholder,
      ),
      maxLines: widget.obscureText ? 1 : widget.maxLines,
      obscureText: widget.obscureText,
      readOnly: widget.readOnly,
      enabled: widget.enabled,
      onChanged: widget.onChanged,
    );
  }
}

/// A wrapper for [Positioned] that falls back gracefully to [Container]
/// when rendered outside of a [Stack] (e.g. during isolated catalog testing).
class UidlPositioned extends StatelessWidget {
  final double? top;
  final double? bottom;
  final double? left;
  final double? right;
  final double? width;
  final double? height;
  final Widget child;

  const UidlPositioned({
    super.key,
    this.top,
    this.bottom,
    this.left,
    this.right,
    this.width,
    this.height,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final hasStackParent = context.findAncestorWidgetOfExactType<Stack>() != null;
    if (!hasStackParent) {
      return SizedBox(
        width: width,
        height: height,
        child: child,
      );
    }
    return Positioned(
      top: top,
      bottom: bottom,
      left: left,
      right: right,
      width: width,
      height: height,
      child: child,
    );
  }
}

/// A wrapper for [Expanded] that falls back gracefully to its [child]
/// when rendered outside of a [Flex] (Row/Column).
class UidlExpanded extends StatelessWidget {
  final int flex;
  final Widget child;

  const UidlExpanded({
    super.key,
    this.flex = 1,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final hasFlexAncestor = context.findAncestorWidgetOfExactType<Flex>() != null;
    if (!hasFlexAncestor) {
      return child;
    }
    return Expanded(
      flex: flex > 0 ? flex : 1,
      child: child,
    );
  }
}

/// A wrapper for [Flexible] that falls back gracefully to its [child]
/// when rendered outside of a [Flex] (Row/Column).
class UidlFlexible extends StatelessWidget {
  final int flex;
  final FlexFit fit;
  final Widget child;

  const UidlFlexible({
    super.key,
    this.flex = 1,
    this.fit = FlexFit.loose,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final hasFlexAncestor = context.findAncestorWidgetOfExactType<Flex>() != null;
    if (!hasFlexAncestor) {
      return child;
    }
    return Flexible(
      flex: flex > 0 ? flex : 1,
      fit: fit,
      child: child,
    );
  }
}
