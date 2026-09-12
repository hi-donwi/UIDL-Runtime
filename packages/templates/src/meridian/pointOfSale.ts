import type { UIDLDocument, UIDLNode } from "~/types";
import { formatIDR } from "./buildDocument";
import { items } from "./mockData";
/**
 * POS catalog/cart flow, built entirely from real state toggles + a real `sequence` checkout
 * action — no engine changes needed. Deliberately NOT a running-total cart: the action language
 * (`$expr` in src/expr/evaluate.ts) supports only literal/path/comparison/boolean expressions,
 * no arithmetic — there is no way to compute "current qty + 1" or sum an array reactively from
 * JSON alone. Rather than fake a total that doesn't actually track the cart, each catalog item
 * is a boolean `state.cart.<itemId>` toggle (in cart / not), and Checkout is a real `sequence`
 * action that resets every toggle to false and shows a confirmation — both mechanically real,
 * neither pretending to compute something the engine can't.
 */

const CATALOG_ITEMS = items.filter((item) => item.for !== "Purchases").slice(0, 8);

/*
 * Classic/ItemsGrid: a 4-column tile grid (`grid-cols-1 md:2 lg:3 xl:4`, `gap-2`), each
 * tile `p-1 border border-gray-300 text-sm text-center` with a 128px gray-100 image well above
 * the name and rate. The whole tile is the click target — Meridian has no "add" button on it.
 */
function itemCard(item: (typeof CATALOG_ITEMS)[number]): UIDLNode {
  return {
    id: `catalog-${item.id}`,
    testId: `pos-item-${item.id}`,
    type: "Column",
    props: { className: "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-850" },
    events: { onClick: [{ setState: { path: `cart.${item.id}`, value: true } }] },
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "gap-1",
      padding: "p-1",
      borderWidth: "border",
      borderColor: "{primitives.color.border}",
      fontSize: "text-sm",
    },
    children: [
      {
        id: `catalog-${item.id}-thumb`,
        type: "Container",
        props: { className: "bg-gray-100 dark:bg-gray-850" },
        style: {
          width: "w-32",
          height: "h-32",
          borderRadius: "rounded-lg",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        children: [
          {
            id: `catalog-${item.id}-initial`,
            type: "Text",
            props: { value: item.name.slice(0, 2).toUpperCase() },
            style: { fontSize: "text-2xl", fontWeight: 600, color: "{primitives.color.text-muted}" },
          },
        ],
      },
      { id: `catalog-${item.id}-name`, type: "Text", props: { value: item.name }, style: { fontWeight: 600 } },
      {
        id: `catalog-${item.id}-rate`,
        type: "Text",
        props: { value: formatIDR(item.rate) },
        style: { color: "{primitives.color.text-secondary}" },
      },
    ],
  };
}

/** SelectedItemRow — a cart line is an `h-row-mid` row closed by a rule, not a card. */
function cartLine(item: (typeof CATALOG_ITEMS)[number]): UIDLNode {
  return {
    id: `cart-line-${item.id}`,
    type: "Row",
    visibility: { condition: { path: `state.cart.${item.id}` } },
    props: { style: { display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center" } },
    style: {
      gap: "gap-3",
      padding: "px-4",
      height: "h-row-mid",
      borderWidth: "border-b",
      borderColor: "{primitives.color.border}",
      fontSize: "text-base",
    },
    children: [
      { id: `cart-line-${item.id}-name`, type: "Text", props: { value: item.name } },
      { id: `cart-line-${item.id}-rate`, type: "Text", props: { value: formatIDR(item.rate) } },
      {
        id: `cart-line-${item.id}-remove`,
        type: "Button",
        props: { label: "Remove", background: false, padding: false },
        events: { onClick: [{ setState: { path: `cart.${item.id}`, value: false } }] },
        style: { color: "{primitives.color.text-secondary}" },
      },
    ],
  };
}

export function buildPosDocument(): UIDLDocument {
  const initialCart: Record<string, boolean> = {};
  for (const item of CATALOG_ITEMS) initialCart[item.id] = false;

  return {
    version: "1.0.0",
    id: "meridian-pos",
    name: "Point of Sale",
    state: { cart: initialCart },
    root: {
      id: "page",
      type: "Row",
      // POS's Classic layout is a two-pane split: the item grid on the start edge, the
      // selected-items table and payment on the end edge, divided by a single border.
      props: { style: { display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" } },
      style: { fontSize: "text-base" },
      children: [
        {
          id: "catalog",
          type: "Column",
          style: { padding: "p-4", gap: "gap-4", borderWidth: "border-e", borderColor: "{primitives.color.border}" },
          children: [
            { id: "catalog-title", type: "Text", props: { value: "Items" }, style: { fontSize: "text-base", fontWeight: 600 } },
            {
              id: "catalog-grid",
              type: "GridView",
              props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" } },
              style: { gap: "gap-2" },
              children: CATALOG_ITEMS.map(itemCard),
            },
          ],
        },
        {
          id: "cart-pane",
          type: "Column",
          children: [
            {
              id: "cart-header",
              type: "Row",
              style: {
                display: "flex",
                alignItems: "center",
                height: "h-row-large",
                padding: "px-4",
                borderWidth: "border-b",
                borderColor: "{primitives.color.border}",
                fontSize: "text-xl",
                fontWeight: 600,
              },
              children: [{ id: "cart-title", type: "Text", props: { value: "Cart" } }],
            },
            { id: "cart-lines", type: "Column", children: CATALOG_ITEMS.map(cartLine) },
            {
              id: "payment",
              type: "Column",
              style: { padding: "p-4", gap: "gap-3" },
              children: [
                {
                  id: "payment-hint",
                  type: "Text",
                  props: { value: "Review items in cart, then complete the sale." },
                  style: { color: "{primitives.color.text-secondary}" },
                },
                {
                  id: "checkout-btn",
                  type: "Button",
                  props: { label: "Complete Sale", variant: "primary" },
                  events: {
                    onClick: [
                      ...CATALOG_ITEMS.map((item) => ({ setState: { path: `cart.${item.id}`, value: false } })),
                      { showSnackbar: { message: "Sale completed — thank you!", duration: 4000 } },
                    ],
                  },
                  style: { width: "w-full" },
                },
              ],
            },
          ],
        },
      ],
    },
  };
}
