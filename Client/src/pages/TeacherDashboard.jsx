import { jsx, jsxs } from "react/jsx-runtime";
import { Sidebar } from "../components/Sidebar.jsx";
import { Users, TrendingUp, Heart, Star, Calendar, Clock } from "lucide-react";
import { students } from "../data/mockData.js";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
function TeacherDashboard() {
  const presentStudents = students.filter((s) => s.status === "present").length;
  const totalStudents = students.length;
  const quickActions = [
    { label: "Take Attendance", icon: "\u2713", color: "bg-secondary", path: "/students" },
    { label: "Track Behavior", icon: "\u{1F44D}", color: "bg-primary", path: "/behavior" },
    { label: "Start Game", icon: "\u{1F3AE}", color: "bg-[#F59E0B]", path: "/games" },
    { label: "Generate Lesson", icon: "\u2728", color: "bg-[#8B5CF6]", path: "/ai-lesson" }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-background", children: [
    /* @__PURE__ */ jsx(Sidebar, {}),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "mb-2", children: "Good Morning, Mrs. Anderson! \u{1F44B}" }),
        /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground", children: "Here's what's happening in your classroom today" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8", children: [
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
                /* @__PURE__ */ jsx("div", { className: "p-3 bg-primary/10 rounded-2xl", children: /* @__PURE__ */ jsx(Users, { className: "w-6 h-6 text-primary" }) }),
                /* @__PURE__ */ jsx("span", { className: "text-[0.875rem] text-secondary", children: "+2 today" })
              ] }),
              /* @__PURE__ */ jsxs("h3", { className: "text-[2rem] mb-1", children: [
                presentStudents,
                "/",
                totalStudents
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Students Present" })
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
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
                /* @__PURE__ */ jsx("div", { className: "p-3 bg-secondary/10 rounded-2xl", children: /* @__PURE__ */ jsx(TrendingUp, { className: "w-6 h-6 text-secondary" }) }),
                /* @__PURE__ */ jsx("span", { className: "text-[0.875rem] text-secondary", children: "+15%" })
              ] }),
              /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1", children: "87%" }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Good Behavior" })
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
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
                /* @__PURE__ */ jsx("div", { className: "p-3 bg-[#F59E0B]/10 rounded-2xl", children: /* @__PURE__ */ jsx(Star, { className: "w-6 h-6 text-[#F59E0B]" }) }),
                /* @__PURE__ */ jsx("span", { className: "text-[0.875rem] text-secondary", children: "Top!" })
              ] }),
              /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1", children: "24" }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Active Students" })
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
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
                /* @__PURE__ */ jsx("div", { className: "p-3 bg-[#EF4444]/10 rounded-2xl", children: /* @__PURE__ */ jsx(Heart, { className: "w-6 h-6 text-[#EF4444]" }) }),
                /* @__PURE__ */ jsx("span", { className: "text-[0.875rem] text-muted-foreground", children: "This week" })
              ] }),
              /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1", children: "3" }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "New Messages" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
        /* @__PURE__ */ jsx("h2", { className: "mb-6", children: "Quick Actions" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: quickActions.map((action, index) => /* @__PURE__ */ jsx(Link, { to: action.path, children: /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, scale: 0.9 },
            animate: { opacity: 1, scale: 1 },
            transition: { delay: 0.4 + index * 0.1 },
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.95 },
            className: `${action.color} text-white rounded-3xl p-6 cursor-pointer shadow-lg hover:shadow-xl transition-all`,
            children: [
              /* @__PURE__ */ jsx("div", { className: "text-[3rem] mb-3", children: action.icon }),
              /* @__PURE__ */ jsx("p", { className: "text-[1rem]", children: action.label })
            ]
          }
        ) }, action.label)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-6", children: [
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, x: -20 },
            animate: { opacity: 1, x: 0 },
            transition: { delay: 0.6 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
                /* @__PURE__ */ jsx(Calendar, { className: "w-6 h-6 text-primary" }),
                /* @__PURE__ */ jsx("h3", { children: "Today's Schedule" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "space-y-4", children: [
                { time: "9:00 AM", activity: "Morning Circle", icon: "\u{1F305}" },
                { time: "10:00 AM", activity: "Alphabet Learning", icon: "\u{1F524}" },
                { time: "11:00 AM", activity: "Number Games", icon: "\u{1F522}" },
                { time: "12:00 PM", activity: "Lunch Break", icon: "\u{1F34E}" },
                { time: "1:00 PM", activity: "Story Time", icon: "\u{1F4DA}" },
                { time: "2:00 PM", activity: "Art & Crafts", icon: "\u{1F3A8}" }
              ].map((item) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 p-3 rounded-2xl hover:bg-accent transition-all", children: [
                /* @__PURE__ */ jsx("div", { className: "text-[2rem]", children: item.icon }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem]", children: item.activity }),
                  /* @__PURE__ */ jsxs("p", { className: "text-[0.875rem] text-muted-foreground flex items-center gap-1", children: [
                    /* @__PURE__ */ jsx(Clock, { className: "w-3 h-3" }),
                    item.time
                  ] })
                ] })
              ] }, item.time)) })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, x: 20 },
            animate: { opacity: 1, x: 0 },
            transition: { delay: 0.7 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
                /* @__PURE__ */ jsx(Star, { className: "w-6 h-6 text-[#F59E0B]" }),
                /* @__PURE__ */ jsx("h3", { children: "Top Performers This Week" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "space-y-4", children: students.slice(0, 6).map((student, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 p-3 rounded-2xl hover:bg-accent transition-all", children: [
                /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[1.5rem]", children: student.avatar }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem]", children: student.name }),
                  /* @__PURE__ */ jsx("div", { className: "flex gap-1 mt-1", children: [...Array(5)].map((_, i) => /* @__PURE__ */ jsx(Star, { className: "w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" }, i)) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "w-8 h-8 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.875rem]", children: [
                  "#",
                  index + 1
                ] })
              ] }, student.id)) })
            ]
          }
        )
      ] })
    ] }) })
  ] });
}
export {
  TeacherDashboard
};
