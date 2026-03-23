import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Sidebar } from "../components/Sidebar.jsx";
import { students as initialStudents } from "../data/mockData.js";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
function BehaviorTracking() {
  const [students] = useState(initialStudents);
  const [behaviorCounts, setBehaviorCounts] = useState({});
  const [lastAction, setLastAction] = useState(null);
  const handleBehaviorClick = (studentId, type) => {
    setBehaviorCounts((prev) => ({
      ...prev,
      [studentId]: {
        good: (prev[studentId]?.good || 0) + (type === "good" ? 1 : 0),
        bad: (prev[studentId]?.bad || 0) + (type === "bad" ? 1 : 0),
        sleepy: (prev[studentId]?.sleepy || 0) + (type === "sleepy" ? 1 : 0),
        active: (prev[studentId]?.active || 0) + (type === "active" ? 1 : 0)
      }
    }));
    setLastAction({ studentId, type });
    if (type === "good" || type === "active") {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
    setTimeout(() => setLastAction(null), 1e3);
  };
  const totalGood = Object.values(behaviorCounts).reduce((sum, counts) => sum + counts.good, 0);
  const totalBad = Object.values(behaviorCounts).reduce((sum, counts) => sum + counts.bad, 0);
  const totalSleepy = Object.values(behaviorCounts).reduce((sum, counts) => sum + counts.sleepy, 0);
  const totalActive = Object.values(behaviorCounts).reduce((sum, counts) => sum + counts.active, 0);
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-background", children: [
    /* @__PURE__ */ jsx(Sidebar, {}),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "mb-2", children: "Behavior Tracking" }),
        /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground", children: "Track student behavior in real-time with one-click actions" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8", children: [
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsx("div", { className: "text-[2.5rem] mb-2", children: "\u{1F44D}" }),
              /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1 text-secondary", children: totalGood }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Good Behaviors" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.1 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsx("div", { className: "text-[2.5rem] mb-2", children: "\u2B50" }),
              /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1 text-primary", children: totalActive }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Active Students" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.2 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsx("div", { className: "text-[2.5rem] mb-2", children: "\u{1F634}" }),
              /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1 text-[#F59E0B]", children: totalSleepy }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Sleepy/Tired" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.3 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsx("div", { className: "text-[2.5rem] mb-2", children: "\u{1F44E}" }),
              /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1 text-destructive", children: totalBad }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Needs Attention" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: students.filter((s) => s.status === "present").map((student, index) => {
        const counts = behaviorCounts[student.id] || { good: 0, bad: 0, sleepy: 0, active: 0 };
        const isAnimating = lastAction?.studentId === student.id;
        return /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, scale: 0.9 },
            animate: { opacity: 1, scale: 1 },
            transition: { delay: index * 0.05 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 mb-6 pb-6 border-b border-border", children: [
                /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[2.5rem] shadow-lg", children: student.avatar }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                  /* @__PURE__ */ jsx("h4", { children: student.name }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mt-2", children: [
                    /* @__PURE__ */ jsxs("div", { className: "text-[0.875rem] text-secondary flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx("span", { children: "\u{1F44D}" }),
                      " ",
                      counts.good
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "text-[0.875rem] text-primary flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx("span", { children: "\u2B50" }),
                      " ",
                      counts.active
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "text-[0.875rem] text-[#F59E0B] flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx("span", { children: "\u{1F634}" }),
                      " ",
                      counts.sleepy
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "text-[0.875rem] text-destructive flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx("span", { children: "\u{1F44E}" }),
                      " ",
                      counts.bad
                    ] })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                /* @__PURE__ */ jsxs(
                  motion.button,
                  {
                    whileTap: { scale: 0.9 },
                    animate: isAnimating && lastAction?.type === "good" ? { scale: [1, 1.1, 1] } : {},
                    onClick: () => handleBehaviorClick(student.id, "good"),
                    className: "bg-secondary hover:bg-secondary/90 text-white p-5 rounded-2xl transition-all shadow-lg hover:shadow-xl",
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-2", children: "\u{1F44D}" }),
                      /* @__PURE__ */ jsx("div", { className: "text-[0.9375rem]", children: "Good" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  motion.button,
                  {
                    whileTap: { scale: 0.9 },
                    animate: isAnimating && lastAction?.type === "bad" ? { scale: [1, 1.1, 1] } : {},
                    onClick: () => handleBehaviorClick(student.id, "bad"),
                    className: "bg-destructive hover:bg-destructive/90 text-white p-5 rounded-2xl transition-all shadow-lg hover:shadow-xl",
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-2", children: "\u{1F44E}" }),
                      /* @__PURE__ */ jsx("div", { className: "text-[0.9375rem]", children: "Bad" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  motion.button,
                  {
                    whileTap: { scale: 0.9 },
                    animate: isAnimating && lastAction?.type === "sleepy" ? { scale: [1, 1.1, 1] } : {},
                    onClick: () => handleBehaviorClick(student.id, "sleepy"),
                    className: "bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white p-5 rounded-2xl transition-all shadow-lg hover:shadow-xl",
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-2", children: "\u{1F634}" }),
                      /* @__PURE__ */ jsx("div", { className: "text-[0.9375rem]", children: "Sleepy" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  motion.button,
                  {
                    whileTap: { scale: 0.9 },
                    animate: isAnimating && lastAction?.type === "active" ? { scale: [1, 1.1, 1] } : {},
                    onClick: () => handleBehaviorClick(student.id, "active"),
                    className: "bg-primary hover:bg-primary/90 text-white p-5 rounded-2xl transition-all shadow-lg hover:shadow-xl",
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-2", children: "\u2B50" }),
                      /* @__PURE__ */ jsx("div", { className: "text-[0.9375rem]", children: "Active" })
                    ]
                  }
                )
              ] })
            ]
          },
          student.id
        );
      }) })
    ] }) })
  ] });
}
export {
  BehaviorTracking
};
