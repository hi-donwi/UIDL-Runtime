import { useState, useEffect, useCallback } from "react";
import { UIDocumentRenderer, meridianDarkTheme, type UIDLDocument } from "@uidl-runtime/core";
import {
  buildBoardDocument,
  buildBacklogDocument,
  buildActivityDocument,
  buildCommitsDocument,
  type BoardData,
  type ActivityData,
  type CommitItem,
  type TaskItem,
} from "./uidlDocuments";

interface ProjectItem {
  key: string;
  client: string;
  description: string;
}

interface SearchResponseItem {
  task: TaskItem;
}

export function WorkspaceControlApp() {
  const [serverUrl] = useState("http://127.0.0.1:8765");
  const [token, setToken] = useState(() => sessionStorage.getItem("ws_token") || "");
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"board" | "backlog" | "activity" | "commits">("board");
  const [document, setDocument] = useState<UIDLDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(
    async <T = Record<string, unknown>>(path: string): Promise<T> => {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${serverUrl}${path}`, { headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error (${res.status}): ${text}`);
      }
      return res.json() as Promise<T>;
    },
    [serverUrl, token],
  );

  const loadDoc = useCallback(
    async (project: string, tab: string) => {
      if (tab === "board") {
        const boardData = await api<BoardData>(`/api/projects/${encodeURIComponent(project)}/board`);
        return buildBoardDocument(project, boardData);
      } else if (tab === "backlog") {
        const searchData = await api<{ results: SearchResponseItem[] }>(
          `/api/projects/${encodeURIComponent(project)}/search`,
        );
        const tasks = (searchData.results || []).map((r: SearchResponseItem) => r.task);
        return buildBacklogDocument(project, tasks);
      } else if (tab === "activity") {
        const activityData = await api<ActivityData>(
          `/api/projects/${encodeURIComponent(project)}/activity`,
        );
        return buildActivityDocument(project, activityData);
      } else {
        const commitsData = await api<{ commits: CommitItem[] }>(
          `/api/projects/${encodeURIComponent(project)}/commits`,
        );
        return buildCommitsDocument(project, commitsData.commits || []);
      }
    },
    [api],
  );

  // Fetch projects on mount or when token changes
  useEffect(() => {
    let cancelled = false;
    api<{ projects: ProjectItem[] }>("/api/projects")
      .then((data) => {
        if (cancelled) return;
        const list = data.projects || [];
        setProjects(list);
        if (list.length > 0) {
          setSelectedProject((prev) => (prev && list.some((p) => p.key === prev) ? prev : list[0].key));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to connect to Agent Workspace server: ${msg}`);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  // Reload document when project or tab changes
  useEffect(() => {
    if (!selectedProject) return;
    let cancelled = false;
    loadDoc(selectedProject, activeTab)
      .then((doc) => {
        if (cancelled) return;
        setDocument(doc);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error rendering ${activeTab} view: ${msg}`);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProject, activeTab, loadDoc]);

  const handleRefresh = () => {
    if (!selectedProject) return;
    setLoading(true);
    setError(null);
    loadDoc(selectedProject, activeTab)
      .then((doc) => {
        setDocument(doc);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error rendering ${activeTab} view: ${msg}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  function handleSaveToken(newToken: string) {
    setToken(newToken);
    sessionStorage.setItem("ws_token", newToken);
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f6fc] flex flex-col font-sans">
      {/* Workspace Control Header */}
      <header className="border-b border-[#30363d] bg-[#161b22] px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="bg-[#58a6ff] text-slate-950 font-black px-2 py-0.5 rounded text-xs tracking-wider">
              UIDL
            </span>
            <span className="font-bold text-sm tracking-tight text-white">Agent Workspace Control</span>
            <span className="text-xs text-[#8b949e]">powered by uidl-runtime</span>
          </div>

          <nav className="flex gap-1 ml-4 bg-[#0d1117] p-1 rounded-md border border-[#30363d]">
            <button
              onClick={() => setActiveTab("board")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === "board"
                  ? "bg-[#21262d] text-[#58a6ff] border border-[#30363d]"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setActiveTab("backlog")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === "backlog"
                  ? "bg-[#21262d] text-[#58a6ff] border border-[#30363d]"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              Backlog
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === "activity"
                  ? "bg-[#21262d] text-[#58a6ff] border border-[#30363d]"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              Activity & Metrics
            </button>
            <button
              onClick={() => setActiveTab("commits")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === "commits"
                  ? "bg-[#21262d] text-[#58a6ff] border border-[#30363d]"
                  : "text-[#8b949e] hover:text-[#f0f6fc]"
              }`}
            >
              Commits
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] rounded px-3 py-1.5 focus:outline-none focus:border-[#58a6ff]"
          >
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key} ({p.client})
              </option>
            ))}
          </select>

          <input
            type="password"
            placeholder="Bearer token..."
            value={token}
            onChange={(e) => handleSaveToken(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] rounded px-3 py-1.5 w-36 focus:outline-none focus:border-[#58a6ff]"
          />

          <button
            onClick={handleRefresh}
            className="bg-[#21262d] hover:bg-[#30363d] text-xs px-3 py-1.5 rounded border border-[#30363d] transition-colors"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-800 text-red-300 text-xs px-4 py-3 rounded">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-[#8b949e] text-sm font-mono">
            Compiling and rendering UIDL document...
          </div>
        )}

        {!loading && document && (
          <div className="rounded-lg border border-[#30363d] bg-[#161b22] shadow-sm overflow-hidden">
            <UIDocumentRenderer document={document} theme={meridianDarkTheme} />
          </div>
        )}
      </main>
    </div>
  );
}
