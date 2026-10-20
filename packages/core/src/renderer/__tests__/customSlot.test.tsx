import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import type { UIDLDocument } from "../../types";
import type { Action } from "../../types/actions";

describe("Custom Component Slot and Extension Escape Hatch", () => {
  it("renders a registered custom React component with evaluated props and onAction callback", () => {
    function TelemetryChart(props: {
      deviceId?: string;
      title?: string;
      onAction?: (action: Action | Action[], payload?: unknown) => void;
    }) {
      return (
        <div data-testid="telemetry-chart">
          <h3>{props.title}</h3>
          <p>Device: {props.deviceId}</p>
          <button
            data-testid="trigger-alert"
            onClick={() => props.onAction?.([{ showSnackbar: { message: "Telemetry Alert" } }])}
          >
            Trigger
          </button>
        </div>
      );
    }

    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "iot-console",
      name: "IoT Console",
      state: {
        activeSensor: "SEN-9921",
      },
      root: {
        id: "custom-slot-1",
        type: "custom",
        props: {
          component: "TelemetryTrendChart",
          title: "Real-time COD & pH",
          deviceId: { $bind: "state.activeSensor" },
        },
      },
    };

    render(
      <UIDocumentRenderer
        document={doc}
        customComponents={{
          TelemetryTrendChart: TelemetryChart,
        }}
      />
    );

    expect(screen.getByTestId("telemetry-chart")).toBeInTheDocument();
    expect(screen.getByText("Real-time COD & pH")).toBeInTheDocument();
    expect(screen.getByText("Device: SEN-9921")).toBeInTheDocument();

    // Trigger action from inside custom component
    fireEvent.click(screen.getByTestId("trigger-alert"));
    expect(screen.getByText("Telemetry Alert")).toBeInTheDocument();
  });

  it("renders a graceful slot fallback when custom component is not in registry", () => {
    const doc: UIDLDocument = {
      version: "1.0.0",
      id: "fallback-doc",
      name: "Fallback Doc",
      root: {
        id: "unregistered-slot",
        type: "custom",
        props: {
          component: "UnregisteredWidget",
        },
      },
    };

    const { container } = render(<UIDocumentRenderer document={doc} />);
    const slotFallback = container.querySelector('[data-custom-slot="UnregisteredWidget"]');
    expect(slotFallback).toBeInTheDocument();
    expect(slotFallback?.textContent).toContain("Custom Slot: UnregisteredWidget");
  });
});
