import 'package:flutter/material.dart';

List<Map<dynamic, dynamic>> mapsOf(dynamic value) {
  if (value is List) {
    return value.whereType<Map>().toList();
  }
  return const [];
}

Widget buildDataTable({
  required String id,
  required Map<String, dynamic> props,
}) {
  final columns = mapsOf(props['columns']);
  final rows = mapsOf(props['rows']);
  if (columns.isEmpty) {
    return Text(
      props['emptyMessage']?.toString() ?? '',
      key: ValueKey(id),
    );
  }
  return SingleChildScrollView(
    key: ValueKey(id),
    scrollDirection: Axis.horizontal,
    child: DataTable(
      columns: [
        for (final column in columns)
          DataColumn(
            label: Text(
              column['label']?.toString() ?? column['key']?.toString() ?? '',
            ),
          ),
      ],
      rows: [
        for (final row in rows)
          DataRow(
            cells: [
              for (final column in columns)
                DataCell(Text('${row[column['key']] ?? ''}')),
            ],
          ),
      ],
    ),
  );
}

Widget buildChart({
  required String id,
  required Map<String, dynamic> props,
}) {
  final xKey = props['xKey']?.toString() ?? 'x';
  final yKey = props['yKey']?.toString() ?? 'y';
  final rows = mapsOf(props['rows']);
  final labels = rows.map((row) => row[xKey]?.toString() ?? '').toList();
  final values = rows.map((row) {
    final raw = row[yKey];
    return raw is num ? raw.toDouble() : 0.0;
  }).toList();
  final title = props['title']?.toString();
  final height = (props['height'] is num) ? (props['height'] as num).toDouble() : 120.0;

  return Column(
    key: ValueKey(id),
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      if (title != null && title.isNotEmpty) Text(title),
      SizedBox(
        height: height,
        child: CustomPaint(
          painter: _BarPainter(values),
          child: const SizedBox.expand(),
        ),
      ),
      Row(
        children: [
          for (final label in labels)
            Expanded(child: Text(label, textAlign: TextAlign.center)),
        ],
      ),
    ],
  );
}

Widget buildCodeMark({
  required String id,
  required String kind,
  required Map<String, dynamic> props,
}) {
  final value = props['value']?.toString() ?? '';
  return Column(
    key: ValueKey(id),
    children: [
      SizedBox(
        width: 96,
        height: kind == 'Barcode' ? 40 : 96,
        child: CustomPaint(painter: _CodePainter(kind, value)),
      ),
      if (value.isNotEmpty) Text(value),
    ],
  );
}

Widget buildDialog({
  required String id,
  required Map<String, dynamic> props,
  required List<Widget> children,
}) {
  if (props['open'] == false) {
    return const SizedBox.shrink();
  }
  final title = props['title']?.toString() ?? '';
  final content = props['content'];
  return AlertDialog(
    key: ValueKey(id),
    title: title.isEmpty ? null : Text(title),
    content: children.isNotEmpty
        ? (children.length == 1 ? children.first : Column(children: children))
        : Text(content?.toString() ?? ''),
  );
}

class _BarPainter extends CustomPainter {
  _BarPainter(this.values);

  final List<double> values;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final max = values.reduce((a, b) => a > b ? a : b);
    if (max <= 0) return;
    final paint = Paint()..color = const Color(0xFF2563EB);
    final barWidth = size.width / (values.length * 2);
    for (var i = 0; i < values.length; i++) {
      final h = (values[i] / max) * size.height;
      final x = barWidth + i * barWidth * 2;
      canvas.drawRect(
        Rect.fromLTWH(x, size.height - h, barWidth, h),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _BarPainter oldDelegate) => oldDelegate.values != values;
}

class _CodePainter extends CustomPainter {
  _CodePainter(this.kind, this.value);

  final String kind;
  final String value;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFF111827);
    if (kind == 'Barcode') {
      for (var i = 0; i < value.length; i++) {
        final x = (i + 1) * (size.width / (value.length + 2));
        final w = 1.0 + (value.codeUnitAt(i) % 3);
        canvas.drawRect(Rect.fromLTWH(x, 0, w, size.height), paint);
      }
      return;
    }
    const modules = 8;
    final cell = size.shortestSide / modules;
    for (var y = 0; y < modules; y++) {
      for (var x = 0; x < modules; x++) {
        final on = (value.hashCode + x * 17 + y * 31) & 1 == 0;
        if (on) {
          canvas.drawRect(Rect.fromLTWH(x * cell, y * cell, cell, cell), paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _CodePainter oldDelegate) =>
      oldDelegate.kind != kind || oldDelegate.value != value;
}
