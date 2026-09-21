import '../binding/binding_resolver.dart';
import '../evaluator/expression_evaluator.dart';
import '../spec/errors.dart';

typedef NavigationHandler = void Function(String route, Map<String, dynamic>? params);
typedef SnackbarHandler = void Function(String message);
typedef MutationHandler = Future<dynamic> Function(String mutation, Map<String, dynamic> payload);
typedef CommandHandler = Future<dynamic> Function(String command, Map<String, dynamic> params);
typedef DownloadHandler = Future<void> Function(String url, String? filename);
typedef ApiHandler = Future<Map<String, dynamic>> Function(String url, String method, Map<String, dynamic>? body, Map<String, String>? headers);
typedef QueryHandler = Future<List<Map<String, dynamic>>> Function(String target, Map<String, dynamic> params);

class ActionDispatcher {
  final Map<String, dynamic> state;
  final Map<String, dynamic> scope;
  final NavigationHandler? onNavigate;
  final SnackbarHandler? onSnackbar;
  final MutationHandler? onMutate;
  final CommandHandler? onCommand;
  final DownloadHandler? onDownload;
  final ApiHandler? onApi;
  final QueryHandler? onQuery;
  final void Function()? onStateChanged;

  ActionDispatcher({
    required this.state,
    required this.scope,
    this.onNavigate,
    this.onSnackbar,
    this.onMutate,
    this.onCommand,
    this.onDownload,
    this.onApi,
    this.onQuery,
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

  static bool isReservedDataEnvelopePath(String path) {
    final normalized = path.startsWith('state.') ? path.substring(6) : path;
    return normalized == r'$data' || normalized.startsWith(r'$data.');
  }

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
            if (ActionDispatcher.isReservedDataEnvelopePath(path)) {
              throw UidlException(
                code: UidlErrorCodes.invalidState,
                message:
                    'setState path "$path" targets the reserved \$data envelope. Documents may read state.\$data.* but must not write it.',
              );
            }
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

      case 'api':
        if (actionConfig is Map && onApi != null) {
          final url = ExpressionEvaluator.evaluate(actionConfig['url'], scope)?.toString() ?? '';
          final method = (actionConfig['method'] as String?)?.toUpperCase() ?? 'GET';
          final body = actionConfig['body'] is Map
              ? Map<String, dynamic>.from(actionConfig['body'] as Map)
              : null;
          final headers = actionConfig['headers'] is Map
              ? Map<String, String>.from(
                  (actionConfig['headers'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())))
              : null;
          final resultPath = actionConfig['resultPath'] as String?;

          if (url.isNotEmpty) {
            try {
              final result = await onApi!(url, method, body, headers);
              if (resultPath != null) {
                final targetPath = resultPath.startsWith('state.') ? resultPath.substring(6) : resultPath;
                setByPath(state, targetPath, result);
                onStateChanged?.call();
              }
            } catch (e) {
              final errorPath = actionConfig['errorPath'] as String?;
              if (errorPath != null) {
                final targetPath = errorPath.startsWith('state.') ? errorPath.substring(6) : errorPath;
                setByPath(state, targetPath, {'error': e.toString()});
                onStateChanged?.call();
              }
            }
          }
        }
        break;

      case 'query':
        if (actionConfig is Map && onQuery != null) {
          final target = actionConfig['target']?.toString() ?? '';
          final params = actionConfig['params'] is Map
              ? Map<String, dynamic>.from(actionConfig['params'] as Map)
              : <String, dynamic>{};
          final resultPath = actionConfig['resultPath'] as String?;

          if (target.isNotEmpty) {
            try {
              final result = await onQuery!(target, params);
              if (resultPath != null) {
                final targetPath = resultPath.startsWith('state.') ? resultPath.substring(6) : resultPath;
                setByPath(state, targetPath, result);
                onStateChanged?.call();
              }
            } catch (e) {
              final errorPath = actionConfig['errorPath'] as String?;
              if (errorPath != null) {
                final targetPath = errorPath.startsWith('state.') ? errorPath.substring(6) : errorPath;
                setByPath(state, targetPath, {'error': e.toString()});
                onStateChanged?.call();
              }
            }
          }
        }
        break;

      case 'showDialog':
      case 'validate':
        break;
    }
  }
}
