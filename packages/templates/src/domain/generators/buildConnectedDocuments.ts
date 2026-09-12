/**
 * Connected Documents Panel Generator.
 *
 * Provides bidirectional navigation along business process chains:
 * - Procure-to-Pay (P2P): Material Request -> RFQ -> Supplier Quote -> Purchase Order -> Purchase Receipt -> Purchase Invoice -> Payment
 * - Quote-to-Cash (Q2C): Sales Quote -> Sales Order -> Delivery Note -> Sales Invoice -> Payment
 */

import type { UIDLNode } from "~/types";

export interface ConnectedDocLink {
  doctype: string;
  id: string;
  label: string;
  route: string;
  status?: string;
}

export function buildConnectedDocumentsSection(links: ConnectedDocLink[]): UIDLNode | null {
  if (!links || links.length === 0) return null;

  return {
    id: "connected-documents-section",
    type: "Container",
    style: {
      padding: "p-4",
      marginTop: "mt-4",
      backgroundColor: "bg-gray-50 dark:bg-gray-850",
      borderWidth: "border",
      borderColor: "{primitives.color.border}",
      borderRadius: "rounded-lg",
    },
    children: [
      {
        id: "connected-docs-title",
        type: "Text",
        props: {
          value: "Connected Documents",
          heading: 5,
        },
        style: {
          fontSize: "text-sm",
          fontWeight: 600,
          marginBottom: "mb-2",
          color: "{primitives.color.text-primary}",
        },
      },
      {
        id: "connected-docs-list",
        type: "Row",
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "gap-2",
          alignItems: "center",
        },
        children: links.map((link, idx) => ({
          id: `conn-link-${link.doctype}-${link.id}-${idx}`,
          type: "Button",
          props: {
            label: `${link.label}: ${link.id}`,
            variant: "secondary",
            size: "small",
          },
          events: {
            onClick: [{ navigate: { route: link.route } }],
          },
        })),
      },
    ],
  };
}
