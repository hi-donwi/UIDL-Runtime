import type { UIDLDocument } from "@uidl-runtime/core";

export interface TaskItem {
  id: string;
  columnId?: string;
  title: string;
  owner?: string;
  priority?: string;
  status?: string;
  [key: string]: unknown;
}

export interface BoardData {
  columns?: Record<string, TaskItem[]>;
  [key: string]: unknown;
}

export interface UsageData {
  total_sessions?: number;
  input_tokens?: number;
  output_tokens?: number;
  [key: string]: unknown;
}

export interface DayMetric {
  day: string;
  human_hours: number;
  agent_hours: number;
  agent_sessions: number;
  [key: string]: unknown;
}

export interface ActiveClockInfo {
  actor?: string;
  tool?: string;
  start?: string;
  note?: string;
  [key: string]: unknown;
}

export interface ActiveClocks {
  human?: ActiveClockInfo | null;
  agent?: ActiveClockInfo | null;
  [key: string]: unknown;
}

export interface ActivityData {
  hours?: {
    human_total?: number;
    agent_total?: number;
    days?: DayMetric[];
  };
  usage?: UsageData;
  active_clocks?: ActiveClocks;
  [key: string]: unknown;
}

export interface CommitItem {
  short_sha: string;
  subject: string;
  author: string;
  date: string;
  [key: string]: unknown;
}

export function buildBoardDocument(projectKey: string, boardData: BoardData): UIDLDocument {
  const columns = [
    { id: "backlog", title: "Backlog", color: "#8b949e" },
    { id: "ready", title: "Ready", color: "#58a6ff" },
    { id: "in_progress", title: "In Progress", color: "#d29922" },
    { id: "review", title: "Review", color: "#bc8cff" },
    { id: "done", title: "Done", color: "#2ea043" },
  ];

  const rawColumns = boardData?.columns || {};
  const rows: Array<Record<string, unknown>> = [];

  for (const [colId, tasks] of Object.entries(rawColumns)) {
    if (Array.isArray(tasks)) {
      tasks.forEach((t: TaskItem) => {
        rows.push({
          id: t.id,
          columnId: colId,
          title: t.title,
          subtitle: t.owner && t.owner !== "unassigned" ? `@${t.owner}` : undefined,
          badge: t.priority ? t.priority.toUpperCase() : "MEDIUM",
          badgeTone: t.priority === "high" ? "red" : t.priority === "low" ? "gray" : "amber",
        });
      });
    }
  }

  return {
    version: "1.0.0",
    id: `board-${projectKey}`,
    name: `Kanban Board — ${projectKey}`,
    theme: "meridian-dark",
    root: {
      id: "board-root",
      type: "Column",
      style: { gap: "1.25rem", padding: "1rem" },
      children: [
        {
          id: "board-navbar",
          type: "Navbar",
          slots: {
            title: [
              {
                id: "board-title",
                type: "Text",
                props: { value: `Project: ${projectKey} — Kanban Board` },
                style: { fontSize: "1.25rem", fontWeight: "700" },
              },
            ],
          },
        },
        {
          id: "board-kanban",
          type: "KanbanBoard",
          props: {
            title: "Sprint Tasks",
            columns,
            rows,
            emptyMessage: "No tasks in this status",
          },
        },
      ],
    },
  };
}

export function buildBacklogDocument(projectKey: string, tasks: TaskItem[]): UIDLDocument {
  const tableColumns = [
    { key: "id", title: "ID", sortable: true },
    { key: "title", title: "Title", sortable: true },
    { key: "status", title: "Status", sortable: true },
    { key: "priority", title: "Priority", sortable: true },
    { key: "owner", title: "Owner", sortable: true },
  ];

  return {
    version: "1.0.0",
    id: `backlog-${projectKey}`,
    name: `Backlog — ${projectKey}`,
    theme: "meridian-dark",
    root: {
      id: "backlog-root",
      type: "Column",
      style: { gap: "1.25rem", padding: "1rem" },
      children: [
        {
          id: "backlog-navbar",
          type: "Navbar",
          slots: {
            title: [
              {
                id: "backlog-title",
                type: "Text",
                props: { value: `Project: ${projectKey} — Backlog Table` },
                style: { fontSize: "1.25rem", fontWeight: "700" },
              },
            ],
          },
        },
        {
          id: "backlog-table",
          type: "DataTable",
          props: {
            columns: tableColumns,
            rows: tasks,
            emptyMessage: "No tasks found in backlog",
          },
        },
      ],
    },
  };
}

export function buildActivityDocument(projectKey: string, activityData: ActivityData): UIDLDocument {
  const humanHours = activityData?.hours?.human_total || 0;
  const agentHours = activityData?.hours?.agent_total || 0;
  const usage = activityData?.usage || {};
  const sessions = usage?.total_sessions || 0;
  const inTokens = (usage?.input_tokens || 0).toLocaleString();
  const outTokens = (usage?.output_tokens || 0).toLocaleString();

  const days = activityData?.hours?.days || [];
  const activeClocks = activityData?.active_clocks;

  return {
    version: "1.0.0",
    id: `activity-${projectKey}`,
    name: `Activity & Metrics — ${projectKey}`,
    theme: "meridian-dark",
    root: {
      id: "activity-root",
      type: "Column",
      style: { gap: "1.5rem", padding: "1rem" },
      children: [
        {
          id: "activity-navbar",
          type: "Navbar",
          slots: {
            title: [
              {
                id: "activity-title",
                type: "Text",
                props: { value: `Activity & Two Clocks Metrics — ${projectKey}` },
                style: { fontSize: "1.25rem", fontWeight: "700" },
              },
            ],
          },
        },
        {
          id: "activity-kpi-grid",
          type: "GridView",
          style: {
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          },
          children: [
            {
              id: "kpi-human",
              type: "Card",
              style: { padding: "1.25rem" },
              children: [
                {
                  id: "kpi-human-label",
                  type: "Text",
                  props: { value: "HUMAN HOURS (PAYROLL)" },
                  style: { fontSize: "0.75rem", color: "#8b949e", fontWeight: "600" },
                },
                {
                  id: "kpi-human-val",
                  type: "Text",
                  props: { value: `${humanHours.toFixed(2)} h` },
                  style: { fontSize: "1.75rem", fontWeight: "700", color: "#58a6ff" },
                },
                {
                  id: "kpi-human-desc",
                  type: "Text",
                  props: {
                    value: activeClocks?.human
                      ? `Currently clocked in: @${activeClocks.human.actor || "active"}`
                      : "Single-threaded developer attention",
                  },
                  style: { fontSize: "0.75rem", color: activeClocks?.human ? "#58a6ff" : "#6e7681" },
                },
              ],
            },
            {
              id: "kpi-agent",
              type: "Card",
              style: { padding: "1.25rem" },
              children: [
                {
                  id: "kpi-agent-label",
                  type: "Text",
                  props: { value: "AGENT HOURS (MACHINE)" },
                  style: { fontSize: "0.75rem", color: "#8b949e", fontWeight: "600" },
                },
                {
                  id: "kpi-agent-val",
                  type: "Text",
                  props: { value: `${agentHours.toFixed(2)} h` },
                  style: { fontSize: "1.75rem", fontWeight: "700", color: "#2ea043" },
                },
                {
                  id: "kpi-agent-desc",
                  type: "Text",
                  props: {
                    value: activeClocks?.agent
                      ? `Currently active: ${activeClocks.agent.tool || "agent"}`
                      : "Autonomous agent machine execution",
                  },
                  style: { fontSize: "0.75rem", color: activeClocks?.agent ? "#2ea043" : "#6e7681" },
                },
              ],
            },
            {
              id: "kpi-tokens",
              type: "Card",
              style: { padding: "1.25rem" },
              children: [
                {
                  id: "kpi-tokens-label",
                  type: "Text",
                  props: { value: "TOKEN SESSIONS" },
                  style: { fontSize: "0.75rem", color: "#8b949e", fontWeight: "600" },
                },
                {
                  id: "kpi-tokens-val",
                  type: "Text",
                  props: { value: `${sessions}` },
                  style: { fontSize: "1.75rem", fontWeight: "700", color: "#bc8cff" },
                },
                {
                  id: "kpi-tokens-desc",
                  type: "Text",
                  props: { value: `${inTokens} in / ${outTokens} out` },
                  style: { fontSize: "0.75rem", color: "#6e7681" },
                },
              ],
            },
          ],
        },
        {
          id: "activity-table",
          type: "DataTable",
          props: {
            columns: [
              { key: "day", title: "Date", sortable: true },
              { key: "human_hours", title: "Human Hours (h)", sortable: true },
              { key: "agent_hours", title: "Agent Hours (h)", sortable: true },
              { key: "agent_sessions", title: "Sessions", sortable: true },
            ],
            rows: days,
            emptyMessage: "No recorded activity for this month",
          },
        },
      ],
    },
  };
}

export function buildCommitsDocument(projectKey: string, commits: CommitItem[]): UIDLDocument {
  return {
    version: "1.0.0",
    id: `commits-${projectKey}`,
    name: `Git Commits — ${projectKey}`,
    theme: "meridian-dark",
    root: {
      id: "commits-root",
      type: "Column",
      style: { gap: "1.25rem", padding: "1rem" },
      children: [
        {
          id: "commits-navbar",
          type: "Navbar",
          slots: {
            title: [
              {
                id: "commits-title",
                type: "Text",
                props: { value: `Project: ${projectKey} — Local Git Commits` },
                style: { fontSize: "1.25rem", fontWeight: "700" },
              },
            ],
          },
        },
        {
          id: "commits-table",
          type: "DataTable",
          props: {
            columns: [
              { key: "short_sha", title: "Commit SHA" },
              { key: "subject", title: "Message" },
              { key: "author", title: "Author" },
              { key: "date", title: "Date" },
            ],
            rows: commits,
            emptyMessage: "No commits found in project repository",
          },
        },
      ],
    },
  };
}
