import { useState, useEffect, useCallback, type FormEvent } from "react";
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
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Modal states for New Task and Move Task
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("backlog");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskOwner, setNewTaskOwner] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Move state
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveTaskId, setMoveTaskId] = useState("");
  const [moveToStatus, setMoveToStatus] = useState("in_progress");
  const [availableTasks, setAvailableTasks] = useState<TaskItem[]>([]);

  const api = useCallback(
    async <T = Record<string, unknown>>(path: string, options: RequestInit = {}): Promise<T> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${serverUrl}${path}`, {
        ...options,
        headers,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error (${res.status}): ${text}`);
      }
      return res.json() as Promise<T>;
    },
    [serverUrl, token],
  );

  const fetchViewData = useCallback(
    async (project: string, tab: string): Promise<{ doc: UIDLDocument; tasks: TaskItem[] }> => {
      if (tab === "board") {
        const boardData = await api<BoardData>(`/api/projects/${encodeURIComponent(project)}/board`);
        const allBoardTasks: TaskItem[] = [];
        if (boardData.columns) {
          for (const tasks of Object.values(boardData.columns)) {
            if (Array.isArray(tasks)) allBoardTasks.push(...tasks);
          }
        }
        return { doc: buildBoardDocument(project, boardData), tasks: allBoardTasks };
      } else if (tab === "backlog") {
        const searchData = await api<{ results: SearchResponseItem[] }>(
          `/api/projects/${encodeURIComponent(project)}/search`,
        );
        const tasks = (searchData.results || []).map((r: SearchResponseItem) => r.task);
        return { doc: buildBacklogDocument(project, tasks), tasks };
      } else if (tab === "activity") {
        const activityData = await api<ActivityData>(
          `/api/projects/${encodeURIComponent(project)}/activity`,
        );
        return { doc: buildActivityDocument(project, activityData), tasks: [] };
      } else {
        const commitsData = await api<{ commits: CommitItem[] }>(
          `/api/projects/${encodeURIComponent(project)}/commits`,
        );
        return { doc: buildCommitsDocument(project, commitsData.commits || []), tasks: [] };
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
    fetchViewData(selectedProject, activeTab)
      .then(({ doc, tasks }) => {
        if (cancelled) return;
        setDocument(doc);
        if (tasks.length > 0) {
          setAvailableTasks(tasks);
          setMoveTaskId((prev) => (prev && tasks.some((t) => t.id === prev) ? prev : tasks[0].id));
        }
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
  }, [selectedProject, activeTab, fetchViewData]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || !selectedProject) return;
    const interval = setInterval(() => {
      fetchViewData(selectedProject, activeTab)
        .then(({ doc, tasks }) => {
          setDocument(doc);
          if (tasks.length > 0) {
            setAvailableTasks(tasks);
          }
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedProject, activeTab, fetchViewData]);

  const handleRefresh = () => {
    if (!selectedProject) return;
    setLoading(true);
    setError(null);
    fetchViewData(selectedProject, activeTab)
      .then(({ doc, tasks }) => {
        setDocument(doc);
        if (tasks.length > 0) {
          setAvailableTasks(tasks);
          setMoveTaskId((prev) => (prev && tasks.some((t) => t.id === prev) ? prev : tasks[0].id));
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Error rendering ${activeTab} view: ${msg}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!selectedProject || !newTaskTitle.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api(`/api/projects/${encodeURIComponent(selectedProject)}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          status: newTaskStatus,
          priority: newTaskPriority,
          owner: newTaskOwner.trim() || "unassigned",
          description: newTaskDesc.trim(),
        }),
      });
      setIsNewTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskOwner("");
      const { doc, tasks } = await fetchViewData(selectedProject, activeTab);
      setDocument(doc);
      if (tasks.length > 0) {
        setAvailableTasks(tasks);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to create task: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMoveTask(e: FormEvent) {
    e.preventDefault();
    if (!selectedProject || !moveTaskId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api(
        `/api/projects/${encodeURIComponent(selectedProject)}/tasks/${encodeURIComponent(moveTaskId)}/move`,
        {
          method: "POST",
          body: JSON.stringify({
            to_status: moveToStatus,
          }),
        },
      );
      setIsMoveOpen(false);
      const { doc, tasks } = await fetchViewData(selectedProject, activeTab);
      setDocument(doc);
      if (tasks.length > 0) {
        setAvailableTasks(tasks);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to move task: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  }

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
            onClick={() => setIsNewTaskOpen(true)}
            className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
          >
            + New Task
          </button>

          {(activeTab === "board" || activeTab === "backlog") && (
            <button
              onClick={() => setIsMoveOpen(true)}
              className="bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] text-xs px-3 py-1.5 rounded border border-[#30363d] transition-colors"
            >
              Move Card
            </button>
          )}

          <label className="flex items-center gap-1.5 text-xs text-[#8b949e] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-[#0d1117] border-[#30363d] text-[#58a6ff] cursor-pointer"
            />
            Auto 10s
          </label>

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

      {/* New Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-4">
              <h3 className="text-sm font-bold text-white">Create New Task — {selectedProject}</h3>
              <button
                onClick={() => setIsNewTaskOpen(false)}
                className="text-[#8b949e] hover:text-white text-base leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement user export endpoint"
                  className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8b949e] mb-1">Status</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="ready">Ready</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8b949e] mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">Owner</label>
                <input
                  type="text"
                  value={newTaskOwner}
                  onChange={(e) => setNewTaskOwner(e.target.value)}
                  placeholder="e.g. donwi or unassigned"
                  className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Optional markdown notes..."
                  className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-white rounded border border-[#30363d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-medium bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Move Modal */}
      {isMoveOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-4">
              <h3 className="text-sm font-bold text-white">Move Task Status — {selectedProject}</h3>
              <button
                onClick={() => setIsMoveOpen(false)}
                className="text-[#8b949e] hover:text-white text-base leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleMoveTask} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">Select Task *</label>
                {availableTasks.length === 0 ? (
                  <p className="text-xs text-[#8b949e]">No tasks available in project</p>
                ) : (
                  <select
                    value={moveTaskId}
                    onChange={(e) => setMoveTaskId(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                  >
                    {availableTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id}: {t.title} [{t.columnId || t.status || "task"}]
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">Target Column / Status</label>
                <select
                  value={moveToStatus}
                  onChange={(e) => setMoveToStatus(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
                >
                  <option value="backlog">Backlog</option>
                  <option value="ready">Ready</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsMoveOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-white rounded border border-[#30363d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || availableTasks.length === 0}
                  className="px-4 py-1.5 text-xs font-medium bg-[#58a6ff] hover:bg-[#388bfd] text-slate-950 font-bold rounded transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Moving..." : "Move Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
