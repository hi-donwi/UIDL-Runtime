import type { UIDLDocument } from "~/types";

export const sampleDocument: UIDLDocument = {
  version: "1.0.0",
  id: "sample-page",
  name: "Sample Page",
  theme: "theme-light",
  root: {
    id: "root",
    type: "Container",
    props: {},
    style: {
      padding: { base: "p-8", lg: "p-16" },
      background: "{primitives.color.background}",
      color: "{primitives.color.text-primary}",
      minHeight: "min-h-screen",
    },
    children: [
      {
        id: "header",
        type: "Row",
        props: {},
        style: {
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "mb-8",
        },
        children: [
          {
            id: "title",
            type: "Text",
            props: {
              value: "Welcome to uidl-runtime",
            },
            style: {
              fontSize: "text-3xl",
              fontWeight: 700,
              color: "{primitives.color.text-primary}",
            },
          },
          {
            id: "subtitle",
            type: "Text",
            props: {
              value: "A JSON Schema-driven visual UI builder",
            },
            style: {
              fontSize: "text-lg",
              color: "{primitives.color.text-secondary}",
            },
          },
        ],
      },
      {
        id: "card-section",
        type: "Column",
        props: {},
        style: {
          gap: "gap-6",
        },
        children: [
          {
            id: "card-1",
            type: "Container",
            props: {},
            style: {
              background: "{primitives.color.surface}",
              padding: "p-6",
              borderRadius: "{primitives.radius.lg}",
              shadow: "shadow-md",
            },
            children: [
              {
                id: "card-1-title",
                type: "Text",
                props: {
                  value: "Getting Started",
                },
                style: {
                  fontSize: "text-xl",
                  fontWeight: 600,
                  marginBottom: "mb-4",
                },
              },
              {
                id: "card-1-text",
                type: "Text",
                props: {
                  value: "This is a visual editor scaffold built with React and Tailwind CSS. Select nodes in the canvas to edit their properties and styles.",
                },
                style: {
                  color: "{primitives.color.text-secondary}",
                  lineHeight: "leading-relaxed",
                },
              },
            ],
          },
          {
            id: "card-2",
            type: "Container",
            props: {},
            style: {
              background: "{primitives.color.surface}",
              padding: "p-6",
              borderRadius: "{primitives.radius.lg}",
              shadow: "shadow-md",
            },
            children: [
              {
                id: "card-2-title",
                type: "Text",
                props: {
                  value: "Features",
                },
                style: {
                  fontSize: "text-xl",
                  fontWeight: 600,
                  marginBottom: "mb-4",
                },
              },
              {
                id: "card-2-list",
                type: "Column",
                props: {},
                style: {
                  gap: "gap-2",
                },
                children: [
                  {
                    id: "feature-1",
                    type: "Text",
                    props: { value: "• JSON Schema-driven document model" },
                    style: { color: "{primitives.color.text-secondary}" },
                  },
                  {
                    id: "feature-2",
                    type: "Text",
                    props: { value: "• Theme-aware style resolution" },
                    style: { color: "{primitives.color.text-secondary}" },
                  },
                  {
                    id: "feature-3",
                    type: "Text",
                    props: { value: "• Responsive values embedded in style" },
                    style: { color: "{primitives.color.text-secondary}" },
                  },
                  {
                    id: "feature-4",
                    type: "Text",
                    props: { value: "• Component registry with variants" },
                    style: { color: "{primitives.color.text-secondary}" },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
