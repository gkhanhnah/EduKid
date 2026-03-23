import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Sidebar } from "../components/Sidebar.jsx";
import { Calendar, Filter } from "lucide-react";
import { motion } from "framer-motion";
function BehaviorHistory() {
  const [filterType, setFilterType] = useState("all");
  const mockHistory = [
    { id: "1", studentName: "Emma Wilson", studentAvatar: "\u{1F467}", type: "good", timestamp: new Date(2026, 2, 22, 9, 30), note: "Helped classmate with assignment" },
    { id: "2", studentName: "Liam Chen", studentAvatar: "\u{1F466}", type: "active", timestamp: new Date(2026, 2, 22, 9, 45), note: "Participated actively in discussion" },
    { id: "3", studentName: "Olivia Smith", studentAvatar: "\u{1F467}", type: "good", timestamp: new Date(2026, 2, 22, 10, 15), note: "Completed all exercises correctly" },
    { id: "4", studentName: "Noah Brown", studentAvatar: "\u{1F466}", type: "sleepy", timestamp: new Date(2026, 2, 22, 10, 30), note: "Appeared tired during lesson" },
    { id: "5", studentName: "Lucas Davis", studentAvatar: "\u{1F466}", type: "active", timestamp: new Date(2026, 2, 22, 11, 0), note: "Asked great questions" },
    { id: "6", studentName: "Sophia Garcia", studentAvatar: "\u{1F467}", type: "good", timestamp: new Date(2026, 2, 22, 11, 15), note: "Excellent behavior in group work" },
    { id: "7", studentName: "Mason Lee", studentAvatar: "\u{1F466}", type: "bad", timestamp: new Date(2026, 2, 22, 11, 30), note: "Disrupted class, talked out of turn" },
    { id: "8", studentName: "Isabella Taylor", studentAvatar: "\u{1F467}", type: "active", timestamp: new Date(2026, 2, 22, 13, 0), note: "Led group presentation" }
  ];
  const filteredHistory = filterType === "all" ? mockHistory : mockHistory.filter((record) => record.type === filterType);
  const behaviorTypes = [
    { type: "all", label: "All", icon: "\u{1F4CB}", color: "bg-muted" },
    { type: "good", label: "Good", icon: "\u{1F44D}", color: "bg-secondary" },
    { type: "active", label: "Active", icon: "\u2B50", color: "bg-primary" },
    { type: "sleepy", label: "Sleepy", icon: "\u{1F634}", color: "bg-[#F59E0B]" },
    { type: "bad", label: "Bad", icon: "\u{1F44E}", color: "bg-destructive" }
  ];
  const getBehaviorStyle = (type) => {
    switch (type) {
      case "good":
        return { bg: "bg-secondary/10", text: "text-secondary", icon: "\u{1F44D}" };
      case "bad":
        return { bg: "bg-destructive/10", text: "text-destructive", icon: "\u{1F44E}" };
      case "sleepy":
        return { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", icon: "\u{1F634}" };
      case "active":
        return { bg: "bg-primary/10", text: "text-primary", icon: "\u2B50" };
      default:
        return { bg: "bg-muted", text: "text-foreground", icon: "\u{1F4CB}" };
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-background", children: [
    /* @__PURE__ */ jsx(Sidebar, {}),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "mb-2", children: "Behavior History" }),
        /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground", children: "View and filter all behavior records" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-6 shadow-lg border border-border mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
          /* @__PURE__ */ jsx(Filter, { className: "w-5 h-5 text-primary" }),
          /* @__PURE__ */ jsx("h3", { children: "Filter by Type" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-3", children: behaviorTypes.map((behavior) => /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setFilterType(behavior.type),
            className: `px-6 py-3 rounded-2xl transition-all ${filterType === behavior.type ? `${behavior.color} text-white shadow-lg` : "bg-muted text-foreground hover:bg-muted/70"}`,
            children: [
              /* @__PURE__ */ jsx("span", { className: "text-[1.25rem] mr-2", children: behavior.icon }),
              behavior.label
            ]
          },
          behavior.type
        )) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8", children: behaviorTypes.slice(1).map((behavior, index) => {
        const count = mockHistory.filter((r) => r.type === behavior.type).length;
        return /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: index * 0.1 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-2", children: behavior.icon }),
              /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1", children: count }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: behavior.label })
            ]
          },
          behavior.type
        );
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-6 shadow-lg border border-border", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
          /* @__PURE__ */ jsx(Calendar, { className: "w-5 h-5 text-primary" }),
          /* @__PURE__ */ jsx("h3", { children: "Today's Records" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-4", children: filteredHistory.map((record, index) => {
          const style = getBehaviorStyle(record.type);
          return /* @__PURE__ */ jsxs(
            motion.div,
            {
              initial: { opacity: 0, x: -20 },
              animate: { opacity: 1, x: 0 },
              transition: { delay: index * 0.05 },
              className: "flex items-start gap-4 p-5 rounded-2xl hover:bg-accent transition-all border border-transparent hover:border-primary/20",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center", children: [
                  /* @__PURE__ */ jsx("div", { className: `w-12 h-12 rounded-2xl ${style.bg} flex items-center justify-center text-[1.5rem]`, children: style.icon }),
                  index < filteredHistory.length - 1 && /* @__PURE__ */ jsx("div", { className: "w-0.5 h-12 bg-border mt-2" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between mb-2", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-[1.5rem]", children: record.studentAvatar }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("h4", { className: "text-[1rem]", children: record.studentName }),
                        /* @__PURE__ */ jsx("p", { className: "text-[0.875rem] text-muted-foreground", children: record.timestamp.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true
                        }) })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: `px-4 py-2 rounded-full text-[0.875rem] ${style.bg} ${style.text}`, children: record.type.charAt(0).toUpperCase() + record.type.slice(1) })
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground pl-11", children: record.note })
                ] })
              ]
            },
            record.id
          );
        }) }),
        filteredHistory.length === 0 && /* @__PURE__ */ jsxs("div", { className: "text-center py-12", children: [
          /* @__PURE__ */ jsx("div", { className: "text-[4rem] mb-4", children: "\u{1F4ED}" }),
          /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground", children: "No records found for this filter" })
        ] })
      ] })
    ] }) })
  ] });
}
export {
  BehaviorHistory
};
