import { useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { resolveRuntimeMessages, type RuntimeMessages } from "./runtimeMessages";
import { RuntimeMessagesContext, type RuntimeMessagesContextValue } from "./runtimeMessagesContext";

export interface RuntimeMessagesProviderProps {
  /** BCP 47 tag. Selects a built-in catalog and becomes the default formatting locale. */
  locale?: string;
  /** Overrides applied over the selected catalog; keys left out keep the catalog's text. */
  messages?: Partial<RuntimeMessages>;
  children?: ReactNode;
}

/**
 * Supplies runtime messages to every component below it. Providers nest: an inner provider
 * without a `locale` builds on the outer provider's messages, so a host can set the language
 * once and override single labels deeper in the tree.
 */
export function RuntimeMessagesProvider({ locale, messages, children }: RuntimeMessagesProviderProps) {
  const parent = useContext(RuntimeMessagesContext);
  const value = useMemo<RuntimeMessagesContextValue>(
    () => ({
      messages: resolveRuntimeMessages(locale, messages, parent.messages),
      locale: locale ?? parent.locale,
    }),
    [locale, messages, parent],
  );
  return <RuntimeMessagesContext.Provider value={value}>{children}</RuntimeMessagesContext.Provider>;
}
