import '../binding/binding_resolver.dart';
import '../evaluator/expression_evaluator.dart';
import '../spec/errors.dart';

typedef NavigationHandler = void Function(String route, Map<String, dynamic>? params);
typedef SnackbarHandler = void Function(String message);
typedef MutationHandler = Future<dynamic> Function(String mutation, Map<String, dynamic> payload);
typedef CommandHandler = Future<dynamic> Function(String command, Map<String, dynamic> params);
typedef DownloadHandler = Future<void> Function(String url, String? filename);

class ActionDispatcher {
  final Map<String, dynamic> state;
  final Map<String, dynamic> scope;
  final NavigationHandler? onNavigate;
  final SnackbarHandler? onSnackbar;
  final MutationHandler? onMutate;
  final CommandHandler? onCommand;
  final DownloadHandler? onDownload;
  final void Function()? onStateChanged;

  ActionDispatcher({
    required this.state,
    required this.scope,
    this.onNavigate,
    this.onSnackbar,
    this.onMutate,
    this.onCommand,
    this.onDownload,
    this.onStateChanged,
  });

  static const Set<String> knownActionKinds = {
    'sequence',
    'if',
    'setState',
    'navigate',
    'api',
    'mutate',
    'command',
    'download',
    'query',
    'showSnackbar',
    'showDialog',
    'validate',
  };

  Future<void> execute(dynamic action, [dynamic eventPayload]) async {
    if (action == null) return;

    if (action is List) {
      for (final subAction in action) {
        await execute(subAction, eventPayload);
      }
      return;
    }

    if (action is! Map<String, dynamic> && action is! Map) {
      throw UidlException(
        code: UidlErrorCodes.unknownAction,
        message: 'Action must be an object or sequence of objects',
      );
    }

    final map = Map<String, dynamic>.from(action as Map);

    final actionKey = map.keys.firstWhere(
      (k) => knownActionKinds.contains(k),
      orElse: () => '',
    );

    if (actionKey.isEmpty) {
      throw UidlException(
        code: UidlErrorCodes.unknownAction,
        message: 'Unknown action type in $map. Known kinds: $knownActionKinds',
      );
    }

    final actionConfig = map[actionKey];

    switch (actionKey) {
      case 'sequence':
        if (actionConfig is List) {
          for (final step in actionConfig) {
            await execute(step, eventPayload);
          }
        }
        break;

      case 'if':
        if (actionConfig is Map) {
          final cond = actionConfig['condition'] ?? actionConfig['test'];
          final conditionResult = ExpressionEvaluator.evaluateCondition(cond, scope);
          if (conditionResult) {
            if (actionConfig.containsKey('then')) {
              await execute(actionConfig['then'], eventPayload);
            }
          } else {
            if (actionConfig.containsKey('else')) {
              await execute(actionConfig['else'], eventPayload);
            }
          }
        }
        break;

      case 'setState':
        if (actionConfig is Map) {
          final path = actionConfig['path'] as String? ?? actionConfig['target'] as String?;
          final value = actionConfig.containsKey('value')
              ? ExpressionEvaluator.evaluate(actionConfig['value'], scope)
              : eventPayload;

          if (path != null) {
            final targetPath = path.startsWith('state.') ? path.substring(6) : path;
            setByPath(state, targetPath, value);
            onStateChanged?.call();
          }
        }
        break;

      case 'navigate':
        if (actionConfig is Map) {
          final route = actionConfig['route'] as String? ?? actionConfig['url'] as String? ?? '';
          final params = actionConfig['params'] is Map
              ? Map<String, dynamic>.from(actionConfig['params'] as Map)
              : null;
          onNavigate?.call(route, params);
        } else if (actionConfig is String) {
          onNavigate?.call(actionConfig, null);
        }
        break;

      case 'showSnackbar':
        if (actionConfig is Map) {
          final msg = actionConfig['message']?.toString() ?? '';
          onSnackbar?.call(msg);
        } else if (actionConfig is String) {
          onSnackbar?.call(actionConfig);
        }
        break;

      case 'mutate':
        if (actionConfig is Map && onMutate != null) {
          final mutation = actionConfig['mutation']?.toString() ?? '';
          final payload = actionConfig['payload'] is Map
              ? Map<String, dynamic>.from(actionConfig['payload'] as Map)
              : <String, dynamic>{};
          await onMutate!(mutation, payload);
        }
        break;

      case 'command':
        if (actionConfig is Map && onCommand != null) {
          final cmd = actionConfig['command']?.toString() ?? '';
          final params = actionConfig['params'] is Map
              ? Map<String, dynamic>.from(actionConfig['params'] as Map)
              : <String, dynamic>{};
          await onCommand!(cmd, params);
        }
        break;

      case 'download':
        if (actionConfig is Map && onDownload != null) {
          final url = ExpressionEvaluator.evaluate(actionConfig['url'], scope)?.toString() ?? '';
          final filename = ExpressionEvaluator.evaluate(actionConfig['filename'], scope)?.toString();
          if (url.isNotEmpty) {
            await onDownload!(url, filename);
          }
        }
        break;

      case 'query':
      case 'api':
      case 'showDialog':
      case 'validate':
        // Supported declarations; handled or stubbed gracefully
        break;
    }
  }
}
