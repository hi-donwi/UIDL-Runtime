export type EventBusListener = (payload: unknown) => void;

export interface EventBus {
  on: (topic: string, listener: EventBusListener) => () => void;
  emit: (topic: string, payload: unknown) => void;
  off: (topic: string, listener: EventBusListener) => void;
}

export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<EventBusListener>>();

  return {
    on: (topic, listener) => {
      if (!listeners.has(topic)) {
        listeners.set(topic, new Set());
      }
      listeners.get(topic)!.add(listener);

      return () => {
        listeners.get(topic)?.delete(listener);
      };
    },
    emit: (topic, payload) => {
      const topicListeners = listeners.get(topic);
      if (topicListeners) {
        for (const listener of topicListeners) {
          listener(payload);
        }
      }
    },
    off: (topic, listener) => {
      listeners.get(topic)?.delete(listener);
    },
  };
}
