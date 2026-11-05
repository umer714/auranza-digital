"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type LocalTask = { id: number; title: string; done: boolean };
const TASK_MAP = "jarvis-cloud-task-ids-v1";
const MEMORY_MAP = "jarvis-cloud-memory-ids-v1";

function readJson<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
}
function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uuid() { return crypto.randomUUID(); }

export default function CloudSync() {
  const userId = useRef<string | null>(null);
  const [status, setStatus] = useState<"checking" | "local" | "syncing" | "synced" | "error">("checking");
  const running = useRef(false);
  const syncAgain = useRef(false);

  useEffect(() => {
    let alive = true;
    let supabase: ReturnType<typeof getSupabaseBrowserClient>;
    try { supabase = getSupabaseBrowserClient(); }
    catch { return; }

    const db = supabase as any;

    async function sync() {
      if (!alive || !userId.current) return;
      setStatus("syncing");
      if (running.current) { syncAgain.current = true; return; }
      running.current = true;
      try {
        const uid = userId.current;
        const [remoteTasks, remoteMemories] = await Promise.all([
          db.from("jarvis_tasks").select("id,title,details,completed,due_at").eq("user_id", uid),
          db.from("jarvis_memories").select("id,title,content,category").eq("user_id", uid)
        ]);
        if (remoteTasks.error) throw remoteTasks.error;
        if (remoteMemories.error) throw remoteMemories.error;

        const localTasks = readJson<LocalTask[]>("jarvis-tasks-v1", []);
        const taskMap = readJson<Record<string, string>>(TASK_MAP, {});
        const mergedTasks = new Map<string, LocalTask>();
        const taskRows = (remoteTasks.data ?? []) as Array<{ id: string; title: string; completed: boolean }>;
        for (const row of taskRows) {
          const numericId = Number.parseInt(row.id.replace(/-/g, "").slice(0, 12), 16) % 9007199254740000;
          taskMap[String(numericId)] = row.id;
          mergedTasks.set(row.id, { id: numericId, title: row.title, done: !!row.completed });
        }
        for (const task of localTasks) {
          const key = String(task.id);
          const cloudId = taskMap[key] || uuid();
          taskMap[key] = cloudId;
          mergedTasks.set(cloudId, task);
        }
        const tasksToSave = Array.from(mergedTasks.values());
        writeJson("jarvis-tasks-v1", tasksToSave);
        writeJson(TASK_MAP, taskMap);
        if (tasksToSave.length) {
          const payload = tasksToSave.map(task => ({
            id: taskMap[String(task.id)], user_id: uid, title: task.title,
            details: "", completed: task.done, updated_at: new Date().toISOString()
          }));
          const result = await db.from("jarvis_tasks").upsert(payload, { onConflict: "id" });
          if (result.error) throw result.error;
        }

        const localNotes = readJson<string[]>("jarvis-memory-v1", []);
        const memoryMap = readJson<Record<string, string>>(MEMORY_MAP, {});
        const mergedNotes = new Map<string, string>();
        const memoryRows = (remoteMemories.data ?? []) as Array<{ id: string; content: string }>;
        for (const row of memoryRows) {
          mergedNotes.set(row.id, row.content);
          memoryMap[row.content] = row.id;
        }
        for (const note of localNotes) {
          const cloudId = memoryMap[note] || uuid();
          memoryMap[note] = cloudId;
          mergedNotes.set(cloudId, note);
        }
        const notesToSave = Array.from(mergedNotes.values());
        writeJson("jarvis-memory-v1", notesToSave);
        writeJson(MEMORY_MAP, memoryMap);
        if (notesToSave.length) {
          const payload = notesToSave.map(note => ({
            id: memoryMap[note], user_id: uid, title: note.slice(0, 80),
            content: note, category: "general", updated_at: new Date().toISOString()
          }));
          const result = await db.from("jarvis_memories").upsert(payload, { onConflict: "id" });
          if (result.error) throw result.error;
        }
        setStatus("synced");
        window.dispatchEvent(new CustomEvent("jarvis-cloud-sync-complete"));
      } catch (error) {
        setStatus("error");
        console.error("JARVIS cloud sync:", error);
        window.dispatchEvent(new CustomEvent("jarvis-cloud-sync-error", {
          detail: error instanceof Error ? error.message : "Cloud sync failed"
        }));
      } finally {
        running.current = false;
        if (alive && syncAgain.current) {
          syncAgain.current = false;
          window.setTimeout(() => void sync(), 0);
        }
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      userId.current = data.user?.id ?? null;
      if (userId.current) void sync();
      else setStatus("local");
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      userId.current = session?.user?.id ?? null;
      if (userId.current) window.setTimeout(() => void sync(), 0);
      else setStatus("local");
    });
    const onLocalChange = () => { if (userId.current) void sync(); };
    window.addEventListener("jarvis-local-data-changed", onLocalChange);
    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener("jarvis-local-data-changed", onLocalChange);
    };
  }, []);

  const labels = { checking: "Checking sync", local: "Device only", syncing: "Syncing…", synced: "Cloud synced", error: "Sync issue" };
  return <div className={`sync-status sync-${status}`} role="status" aria-live="polite"><span />{labels[status]}</div>;
}
