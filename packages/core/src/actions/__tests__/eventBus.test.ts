import { describe, it, expect, vi } from "vitest";
import { createEventBus } from "../eventBus";

describe("event bus", () => {
  it("emits and receives events", () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.on("test", listener);
    bus.emit("test", "payload");
    expect(listener).toHaveBeenCalledWith("payload");
  });

  it("unsubscribes listener", () => {
    const bus = createEventBus();
    const listener = vi.fn();
    const unsub = bus.on("test", listener);
    unsub();
    bus.emit("test", "payload");
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not emit to other topics", () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.on("a", listener);
    bus.emit("b", "payload");
    expect(listener).not.toHaveBeenCalled();
  });

  it("emits to multiple listeners", () => {
    const bus = createEventBus();
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    bus.on("test", listener1);
    bus.on("test", listener2);
    bus.emit("test", "payload");
    expect(listener1).toHaveBeenCalledWith("payload");
    expect(listener2).toHaveBeenCalledWith("payload");
  });

  it("off removes listener", () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.on("test", listener);
    bus.off("test", listener);
    bus.emit("test", "payload");
    expect(listener).not.toHaveBeenCalled();
  });
});
