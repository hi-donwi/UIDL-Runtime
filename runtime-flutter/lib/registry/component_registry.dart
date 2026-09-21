import 'dart:convert';
import 'dart:io';

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
      final obscureText = props['obscureText'] == true;
      final readOnly = props['readOnly'] == true;
      final enabled = props['enabled'] != false;
      return TextField(
        key: ValueKey('${node.id}_$value'),
        controller: TextEditingController(text: value),
        decoration: InputDecoration(
          labelText: placeholder,
        ),
        obscureText: obscureText,
        readOnly: readOnly,
        enabled: enabled,
        onChanged: (val) => onEvent('onChange', val),
      );
    });

    register('Image', (context, node, props, children, onEvent) {
      final src = props['src']?.toString() ?? '';
      final width = props['width'] is num ? props['width'].toDouble() : null;
      final height = props['height'] is num ? props['height'].toDouble() : null;
      final fit = _parseBoxFit(props['fit']);

      if (src.startsWith('http://') || src.startsWith('https://')) {
        return Image.network(
          src,
          key: ValueKey(node.id),
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (context, error, stackTrace) => _buildImagePlaceholder(node.id),
        );
      } else if (src.startsWith('asset://') || src.startsWith('assets/')) {
        final assetPath = src.startsWith('asset://') ? src.substring(8) : src;
        return Image.asset(
          assetPath,
          key: ValueKey(node.id),
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (context, error, stackTrace) => _buildImagePlaceholder(node.id),
        );
      } else if (src.startsWith('file://') || src.startsWith('/')) {
        final filePath = src.startsWith('file://') ? src.substring(7) : src;
        return Image.file(
          File(filePath),
          key: ValueKey(node.id),
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (context, error, stackTrace) => _buildImagePlaceholder(node.id),
        );
      } else if (src.startsWith('data:image/')) {
        try {
          final base64Data = src.split(',').last;
          final bytes = base64Decode(base64Data);
          return Image.memory(
            bytes,
            key: ValueKey(node.id),
            width: width,
            height: height,
            fit: fit,
          );
        } catch (e) {
          return _buildImagePlaceholder(node.id);
        }
      }
      return _buildImagePlaceholder(node.id);
    });

    register('ListView', (context, node, props, children, onEvent) {
      final shrinkWrap = props['shrinkWrap'] != false;
      final scrollable = props['scrollable'] != false;
      return ListView(
        key: ValueKey(node.id),
        shrinkWrap: shrinkWrap,
        physics: scrollable ? null : const NeverScrollableScrollPhysics(),
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
      final iconName = props['name']?.toString() ?? props['icon']?.toString();
      final size = props['size'] is num ? props['size'].toDouble() : null;
      final color = ThemeResolver.parseColor(props['color']);
      final iconData = _resolveIconData(iconName);
      return Icon(
        iconData,
        key: ValueKey(node.id),
        size: size,
        color: color,
      );
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
      final min = props['min'] is num ? props['min'].toDouble() : 0.0;
      final max = props['max'] is num ? props['max'].toDouble() : 1.0;
      final value = raw is num ? raw.toDouble().clamp(min, max).toDouble() : min;
      return Slider(
        key: ValueKey(node.id),
        value: value,
        min: min,
        max: max,
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

  static BoxFit _parseBoxFit(dynamic val) {
    switch (val?.toString().toLowerCase()) {
      case 'contain':
        return BoxFit.contain;
      case 'cover':
        return BoxFit.cover;
      case 'fill':
        return BoxFit.fill;
      case 'fitwidth':
        return BoxFit.fitWidth;
      case 'fitheight':
        return BoxFit.fitHeight;
      case 'none':
        return BoxFit.none;
      case 'scaledown':
        return BoxFit.scaleDown;
      default:
        return BoxFit.contain;
    }
  }

  static Widget _buildImagePlaceholder(String nodeId) {
    return Container(
      key: ValueKey(nodeId),
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Icon(Icons.image_outlined, color: Colors.grey.shade400, size: 24),
    );
  }

  static IconData? _resolveIconData(String? name) {
    if (name == null || name.isEmpty) return Icons.help_outline;

    const iconMap = <String, IconData>{
      'home': Icons.home,
      'settings': Icons.settings,
      'search': Icons.search,
      'add': Icons.add,
      'remove': Icons.remove,
      'edit': Icons.edit,
      'delete': Icons.delete,
      'save': Icons.save,
      'cancel': Icons.cancel,
      'check': Icons.check,
      'close': Icons.close,
      'menu': Icons.menu,
      'more': Icons.more_vert,
      'more_horiz': Icons.more_horiz,
      'arrow_back': Icons.arrow_back,
      'arrow_forward': Icons.arrow_forward,
      'arrow_up': Icons.arrow_upward,
      'arrow_down': Icons.arrow_downward,
      'expand_more': Icons.expand_more,
      'expand_less': Icons.expand_less,
      'chevron_right': Icons.chevron_right,
      'chevron_left': Icons.chevron_left,
      'person': Icons.person,
      'people': Icons.people,
      'account_circle': Icons.account_circle,
      'email': Icons.email,
      'phone': Icons.phone,
      'location_on': Icons.location_on,
      'notifications': Icons.notifications,
      'favorite': Icons.favorite,
      'favorite_border': Icons.favorite_border,
      'star': Icons.star,
      'star_border': Icons.star_border,
      'share': Icons.share,
      'link': Icons.link,
      'copy': Icons.copy,
      'paste': Icons.content_paste,
      'undo': Icons.undo,
      'redo': Icons.redo,
      'refresh': Icons.refresh,
      'download': Icons.download,
      'upload': Icons.upload,
      'cloud': Icons.cloud,
      'cloud_off': Icons.cloud_off,
      'wifi': Icons.wifi,
      'wifi_off': Icons.wifi_off,
      'bluetooth': Icons.bluetooth,
      'gps': Icons.gps_fixed,
      'camera': Icons.camera_alt,
      'photo': Icons.photo,
      'image': Icons.image,
      'video': Icons.videocam,
      'music_note': Icons.music_note,
      'play': Icons.play_arrow,
      'pause': Icons.pause,
      'stop': Icons.stop,
      'skip_next': Icons.skip_next,
      'skip_previous': Icons.skip_previous,
      'volume_up': Icons.volume_up,
      'volume_down': Icons.volume_down,
      'volume_off': Icons.volume_off,
      'mute': Icons.volume_off,
      'lock': Icons.lock,
      'lock_open': Icons.lock_open,
      'visibility': Icons.visibility,
      'visibility_off': Icons.visibility_off,
      'info': Icons.info,
      'warning': Icons.warning,
      'error': Icons.error,
      'help': Icons.help,
      'help_outline': Icons.help_outline,
      'bolt': Icons.bolt,
      'battery_full': Icons.battery_full,
      'battery_empty': Icons.battery_0_bar,
      'battery_5_bar': Icons.battery_5_bar,
      'battery_3_bar': Icons.battery_3_bar,
      'battery_1_bar': Icons.battery_1_bar,
      'power': Icons.power_settings_new,
      'logout': Icons.logout,
      'login': Icons.login,
      'dashboard': Icons.dashboard,
      'analytics': Icons.analytics,
      'chart_bar': Icons.bar_chart,
      'chart_line': Icons.show_chart,
      'chart_pie': Icons.pie_chart,
      'table_chart': Icons.table_chart,
      'calendar_today': Icons.calendar_today,
      'event': Icons.event,
      'schedule': Icons.schedule,
      'timer': Icons.timer,
      'access_time': Icons.access_time,
      'folder': Icons.folder,
      'folder_open': Icons.folder_open,
      'file_present': Icons.file_present,
      'description': Icons.description,
      'note': Icons.note,
      'bookmark': Icons.bookmark,
      'bookmark_border': Icons.bookmark_border,
      'flag': Icons.flag,
      'label': Icons.label,
      'tag': Icons.tag,
      'archive': Icons.archive,
      'inbox': Icons.inbox,
      'send': Icons.send,
      'reply': Icons.reply,
      'forward': Icons.forward,
      'chat': Icons.chat,
      'comment': Icons.comment,
      'forum': Icons.forum,
      'group': Icons.group,
      'group_add': Icons.group_add,
      'badge': Icons.badge,
      'work': Icons.work,
      'business': Icons.business,
      'school': Icons.school,
      'store': Icons.store,
      'shopping_cart': Icons.shopping_cart,
      'payments': Icons.payments,
      'account_balance': Icons.account_balance,
      'savings': Icons.savings,
      'credit_card': Icons.credit_card,
      'local_shipping': Icons.local_shipping,
      'flight': Icons.flight,
      'train': Icons.train,
      'directions_car': Icons.directions_car,
      'directions_bike': Icons.directions_bike,
      'directions_walk': Icons.directions_walk,
      'map': Icons.map,
      'terrain': Icons.terrain,
      'beach_access': Icons.beach_access,
      'park': Icons.park,
      'pets': Icons.pets,
      'spa': Icons.spa,
      'fitness_center': Icons.fitness_center,
      'sports_esports': Icons.sports_esports,
      'movie': Icons.movie,
      'music': Icons.music_note,
      'palette': Icons.palette,
      'brush': Icons.brush,
      'format_paint': Icons.format_paint,
      'format_bold': Icons.format_bold,
      'format_italic': Icons.format_italic,
      'format_underline': Icons.format_underline,
      'format_list_bulleted': Icons.format_list_bulleted,
      'format_list_numbered': Icons.format_list_numbered,
      'text_fields': Icons.text_fields,
      'code': Icons.code,
      'terminal': Icons.terminal,
      'bug_report': Icons.bug_report,
      'extension': Icons.extension,
      'widgets': Icons.widgets,
      'apps': Icons.apps,
      'dashboard_customize': Icons.dashboard_customize,
      'view_list': Icons.view_list,
      'view_module': Icons.view_module,
      'grid_view': Icons.grid_view,
      'filter_list': Icons.filter_list,
      'sort': Icons.sort,
      'swap_horiz': Icons.swap_horiz,
      'swap_vert': Icons.swap_vert,
      'compare_arrows': Icons.compare_arrows,
      'tune': Icons.tune,
      'build': Icons.build,
      'construction': Icons.construction,
      'handyman': Icons.handyman,
      'science': Icons.science,
      'biotech': Icons.biotech,
      'calculate': Icons.calculate,
      'assessment': Icons.assessment,
      'trending_up': Icons.trending_up,
      'trending_down': Icons.trending_down,
      'auto_graph': Icons.auto_graph,
      'insights': Icons.insights,
      'integration_instructions': Icons.integration_instructions,
      'api': Icons.api,
      'storage': Icons.storage,
      'dns': Icons.dns,
      'developer_board': Icons.developer_board,
      'memory': Icons.memory,
      'computer': Icons.computer,
      'phone_android': Icons.phone_android,
      'tablet': Icons.tablet,
      'watch': Icons.watch,
      'desktop_mac': Icons.desktop_mac,
      'laptop': Icons.laptop,
      'router': Icons.router,
      'hub': Icons.hub,
      'sim_card': Icons.sim_card,
      'security': Icons.security,
      'verified_user': Icons.verified_user,
      'admin_panel_settings': Icons.admin_panel_settings,
      'manage_accounts': Icons.manage_accounts,
      'supervisor_account': Icons.supervisor_account,
      'gavel': Icons.gavel,
      'policy': Icons.policy,
      'gpp_good': Icons.gpp_good,
      'shield': Icons.shield,
      'shield_outlined': Icons.shield_outlined,
      'report_problem': Icons.report_problem,
      'feedback': Icons.feedback,
      'thumb_up': Icons.thumb_up,
      'thumb_down': Icons.thumb_down,
      'emoji_emotions': Icons.emoji_emotions,
      'mood': Icons.mood,
      'sentiment_satisfied': Icons.sentiment_satisfied,
      'celebration': Icons.celebration,
      'party_mode': Icons.party_mode,
      'cake': Icons.cake,
      'gift': Icons.card_giftcard,
      'local_offer': Icons.local_offer,
      'redeem': Icons.redeem,
      'card_giftcard': Icons.card_giftcard,
      'loyalty': Icons.loyalty,
    };

    final lowerName = name.toLowerCase();
    if (iconMap.containsKey(lowerName)) {
      return iconMap[lowerName];
    }

    for (final entry in iconMap.entries) {
      if (entry.key.replaceAll('_', '') == lowerName.replaceAll('_', '')) {
        return entry.value;
      }
    }

    return Icons.help_outline;
  }
}
