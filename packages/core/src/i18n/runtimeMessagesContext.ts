import { createContext, useContext } from "react";
import { runtimeMessagesEn, type RuntimeMessages } from "./runtimeMessages";

export interface RuntimeMessagesContextValue {
  messages: RuntimeMessages;
  locale: string | undefined;
}

export const RuntimeMessagesContext = createContext<RuntimeMessagesContextValue>({
  messages: runtimeMessagesEn,
  locale: undefined,
});

/** The runtime messages in effect. Outside any provider this is the English catalog. */
export function useRuntimeMessages(): RuntimeMessages {
  return useContext(RuntimeMessagesContext).messages;
}

/** The locale set by the nearest provider that has one, or `undefined`. */
export function useRuntimeLocale(): string | undefined {
  return useContext(RuntimeMessagesContext).locale;
}
