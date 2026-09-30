import 'dart:async';

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
typedef UploadHandler = Future<Map<String, dynamic>> Function(String url, String filePath, String fieldName, Map<String, String>? headers);
typedef DialogHandler = Future<bool> Function(String title, String message, String? confirmLabel, String? cancelLabel);
typedef ClipboardHandler = Future<void> Function(String text);
typedef SubscriptionHandler = FutureOr<Stream<dynamic>?> Function(
  String url, {
  String? protocol,
  String? topic,
  Map<String, String>? headers,
  Map<String, dynamic>? params,
});
typedef UnsubscribeHandler = FutureOr<void> Function(String subscriptionId);

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
  final UploadHandler? onUpload;
  final DialogHandler? onConfirm;
  final ClipboardHandler? onClipboard;
  final SubscriptionHandler? onSubscribe;
  final UnsubscribeHandler? onUnsubscribe;
  final void Function()? onStateChanged;

  final Map<String, StreamSubscription<dynamic>> _activeSubscriptions = {};

  Map<String, StreamSubscription<dynamic>> get activeSubscriptions =>
      Map.unmodifiable(_activeSubscriptions);

  bool isSubscribed(String id) => _activeSubscriptions.containsKey(id);

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
    this.onUpload,
    this.onConfirm,
    this.onClipboard,
    this.onSubscribe,
    this.onUnsubscribe,
    this.onStateChanged,
  });

  Future<void> cancelSubscription(String id) async {
    final sub = _activeSubscriptions.remove(id);
    if (sub != null) {
      await sub.cancel();
      await onUnsubscribe?.call(id);
    }
  }

  Future<void> cancelAllSubscriptions() async {
    final entries = _activeSubscriptions.entries.toList();
    _activeSubscriptions.clear();
    for (final entry in entries) {
      await entry.value.cancel();
      await onUnsubscribe?.call(entry.key);
    }
  }

  void dispose() {
    cancelAllSubscriptions();
  }

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
    'upload',
    'confirm',
    'copyToClipboard',
    'subscribe',
    'unsubscribe',
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
    final effectiveScope = eventPayload != null
        ? <String, dynamic>{...scope, 'event': eventPayload}
        : scope;

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
          final conditionResult = ExpressionEvaluator.evaluateCondition(cond, effectiveScope);
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
              ? ExpressionEvaluator.evaluate(actionConfig['value'], effectiveScope)
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
        if (actionConfig is Map) {
          final title = actionConfig['title']?.toString() ?? 'Notice';
          final message = actionConfig['message']?.toString() ?? '';
          if (onConfirm != null) {
            await onConfirm!(title, message, 'OK', null);
          } else {
            onSnackbar?.call(message);
          }
        }
        break;

      case 'confirm':
        if (actionConfig is Map) {
          final title = actionConfig['title']?.toString() ?? 'Confirm';
          final message = actionConfig['message']?.toString() ?? '';
          final confirmLabel = actionConfig['confirmLabel']?.toString();
          final cancelLabel = actionConfig['cancelLabel']?.toString();

          bool confirmed = true;
          if (onConfirm != null) {
            confirmed = await onConfirm!(title, message, confirmLabel, cancelLabel);
          }

          if (confirmed) {
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

      case 'upload':
        if (actionConfig is Map) {
          final url = ExpressionEvaluator.evaluate(actionConfig['url'], scope)?.toString() ?? '';
          final filePath = ExpressionEvaluator.evaluate(actionConfig['filePath'], scope)?.toString() ?? '';
          final fieldName = actionConfig['fieldName']?.toString() ?? 'file';
          final headers = actionConfig['headers'] is Map
              ? Map<String, String>.from(
                  (actionConfig['headers'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())))
              : null;
          final resultPath = actionConfig['resultPath'] as String?;

          if (url.isNotEmpty && onUpload != null) {
            try {
              final result = await onUpload!(url, filePath, fieldName, headers);
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

      case 'copyToClipboard':
        final text = (actionConfig is Map
            ? ExpressionEvaluator.evaluate(actionConfig['text'], scope)?.toString()
            : actionConfig?.toString()) ?? '';
        if (text.isNotEmpty) {
          if (onClipboard != null) {
            await onClipboard!(text);
          } else {
            onSnackbar?.call('Copied to clipboard');
          }
        }
        break;

      case 'subscribe':
        if (actionConfig is Map) {
          final url = ExpressionEvaluator.evaluate(actionConfig['url'], scope)?.toString() ?? '';
          final topic = ExpressionEvaluator.evaluate(
            actionConfig['topic'] ?? actionConfig['channel'],
            scope,
          )?.toString();
          final protocol = actionConfig['protocol']?.toString() ?? 'sse';
          final subId = actionConfig['id']?.toString() ??
              (url.isNotEmpty ? url : (topic ?? 'default_stream'));

          final isCancel = actionConfig['cancel'] == true || actionConfig['unsubscribe'] == true;
          if (isCancel) {
            await cancelSubscription(subId);
            break;
          }

          final targetPathRaw = (actionConfig['targetState'] ?? actionConfig['resultPath']) as String?;
          if (targetPathRaw != null && ActionDispatcher.isReservedDataEnvelopePath(targetPathRaw)) {
            throw UidlException(
              code: UidlErrorCodes.invalidState,
              message:
                  'subscribe target "$targetPathRaw" targets the reserved \$data envelope. Documents may read state.\$data.* but must not write it.',
            );
          }

          if (onSubscribe == null) {
            final errorPath = actionConfig['errorPath'] as String?;
            if (errorPath != null) {
              final targetPath = errorPath.startsWith('state.') ? errorPath.substring(6) : errorPath;
              setByPath(state, targetPath, {'error': 'Subscription handler not configured'});
              onStateChanged?.call();
            }
            if (actionConfig.containsKey('onError')) {
              await execute(actionConfig['onError'], {'error': 'Subscription handler not configured'});
            }
            break;
          }

          // Cancel prior subscription with identical ID to prevent duplicate listeners
          if (_activeSubscriptions.containsKey(subId)) {
            await cancelSubscription(subId);
          }

          final headers = actionConfig['headers'] is Map
              ? Map<String, String>.from(
                  (actionConfig['headers'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())))
              : null;
          final params = actionConfig['params'] is Map
              ? Map<String, dynamic>.from(actionConfig['params'] as Map)
              : null;

          final targetPath = targetPathRaw != null
              ? (targetPathRaw.startsWith('state.') ? targetPathRaw.substring(6) : targetPathRaw)
              : null;

          final mode = actionConfig['mode']?.toString().toLowerCase();
          final maxItems = actionConfig['maxItems'] as int?;

          try {
            final stream = await onSubscribe!(
              url,
              protocol: protocol,
              topic: topic,
              headers: headers,
              params: params,
            );

            if (stream == null) {
              break;
            }

            // ignore: cancel_subscriptions
            late final StreamSubscription<dynamic> subscription;
            subscription = stream.listen(
              (eventData) async {
                if (targetPath != null) {
                  final dynamic dataPayload = (eventData is Map && eventData.containsKey('data'))
                      ? eventData['data']
                      : eventData;

                  final currentVal = resolvePath('state.$targetPath', scope);

                  if (mode == 'append' || (mode == null && currentVal is List)) {
                    final list = currentVal is List ? List<dynamic>.from(currentVal) : <dynamic>[];
                    list.add(dataPayload);
                    if (maxItems != null && maxItems > 0 && list.length > maxItems) {
                      list.removeRange(0, list.length - maxItems);
                    }
                    setByPath(state, targetPath, list);
                  } else if (mode == 'merge' || (mode == null && currentVal is Map && dataPayload is Map)) {
                    final currentMap = currentVal is Map
                        ? Map<String, dynamic>.from(currentVal)
                        : <String, dynamic>{};
                    if (dataPayload is Map) {
                      for (final entry in dataPayload.entries) {
                        currentMap[entry.key.toString()] = entry.value;
                      }
                    }
                    setByPath(state, targetPath, currentMap);
                  } else {
                    setByPath(state, targetPath, dataPayload);
                  }

                  onStateChanged?.call();
                }

                if (actionConfig.containsKey('onData')) {
                  await execute(actionConfig['onData'], eventData);
                }
              },
              onError: (dynamic error) async {
                final errorPath = actionConfig['errorPath'] as String?;
                if (errorPath != null) {
                  final targetErrPath = errorPath.startsWith('state.') ? errorPath.substring(6) : errorPath;
                  setByPath(state, targetErrPath, {'error': error.toString()});
                  onStateChanged?.call();
                }
                if (actionConfig.containsKey('onError')) {
                  await execute(actionConfig['onError'], {'error': error.toString()});
                }
              },
              onDone: () {
                _activeSubscriptions.remove(subId);
              },
              cancelOnError: false,
            );

            _activeSubscriptions[subId] = subscription;
          } catch (e) {
            final errorPath = actionConfig['errorPath'] as String?;
            if (errorPath != null) {
              final targetPath = errorPath.startsWith('state.') ? errorPath.substring(6) : errorPath;
              setByPath(state, targetPath, {'error': e.toString()});
              onStateChanged?.call();
            }
            if (actionConfig.containsKey('onError')) {
              await execute(actionConfig['onError'], {'error': e.toString()});
            }
          }
        }
        break;

      case 'unsubscribe':
        final subId = actionConfig is Map
            ? (actionConfig['id'] ?? actionConfig['url'] ?? actionConfig['topic'] ?? actionConfig['channel'])?.toString()
            : actionConfig?.toString();
        if (subId != null && subId.isNotEmpty) {
          await cancelSubscription(subId);
        } else {
          await cancelAllSubscriptions();
        }
        break;

      case 'validate':
        break;
    }
  }
}
