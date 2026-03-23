import { useState } from "react";
import { createBehavior } from '../services/api.js'
import { useStudents } from "../hooks/useStudents.js";
import { LoadingState } from "../components/LoadingState.jsx";
import { ErrorBanner } from "../components/ErrorBanner.jsx";
import { BehaviorActionButtons } from "../components/BehaviorActionButtons.jsx";

export default function ClassroomPage() {
  const { students, loading, error, refresh } = useStudents();
  const [pendingId, setPendingId] = useState(null);
  const [notice, setNotice] = useState("");

  async function handleBehavior(studentId, type) {
    setNotice("");
    setPendingId(studentId);
    try {
      await createBehavior({ studentId, type })
      setNotice(`Logged ${type.toLowerCase()} behavior.`);
    } catch (e) {
      setNotice(e.message || "Could not log behavior.");
    } finally {
      setPendingId(null);
    }
  }

  if (loading) return <LoadingState label="Loading students…" />; 

  return (
    <section className="page">
      <h1 className="page-title">Classroom</h1>
      <p className="page-lead">
        Quick behavior logging for each student. Actions are saved immediately.
      </p>
      <ErrorBanner message={error} onRetry={refresh} />
      {notice ? (
        <p className={`banner ${notice.includes("Could not") ? "banner-error" : "banner-success"}`}>
          {notice}
        </p>
      ) : null}
      {students.length === 0 ? (
        <p className="state">No students yet. Add some under Student management.</p>
      ) : (
        <ul className="classroom-list">
          {students.map((s) => {
            const id = String(s._id)
            return (
              <li key={id} className="classroom-row card">
                <div className="classroom-row-main">
                  <span className="student-name">{s.name}</span>
                  {s.classId ? (
                    <span className="muted">Class {s.classId}</span>
                  ) : null}
                </div>
                <BehaviorActionButtons
                  busy={pendingId === id}
                  onAction={(type) => handleBehavior(id, type)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
