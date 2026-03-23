import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MessageCircle, TrendingUp, Award, Clock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
function ParentDashboard() {
  const [childName] = useState("Emma Wilson");
  const todayBehavior = [
    { type: "good", icon: "\u{1F44D}", label: "Good Behavior", count: 4, color: "text-secondary" },
    { type: "active", icon: "\u2B50", label: "Active", count: 6, color: "text-primary" },
    { type: "sleepy", icon: "\u{1F634}", label: "Tired", count: 1, color: "text-[#F59E0B]" },
    { type: "bad", icon: "\u{1F44E}", label: "Needs Attention", count: 0, color: "text-destructive" }
  ];
  const recentActivities = [
    { time: "2:30 PM", activity: "Completed Art & Crafts", icon: "\u{1F3A8}", color: "bg-[#F59E0B]" },
    { time: "1:00 PM", activity: "Story Time - Great participation!", icon: "\u{1F4DA}", color: "bg-primary" },
    { time: "11:00 AM", activity: "Played Number Counting Game", icon: "\u{1F522}", color: "bg-secondary" },
    { time: "10:00 AM", activity: "Alphabet Learning - 100% Score", icon: "\u{1F524}", color: "bg-[#8B5CF6]" },
    { time: "9:00 AM", activity: "Morning Circle - Present", icon: "\u{1F305}", color: "bg-[#06B6D4]" }
  ];
  const weeklyProgress = [
    { day: "Mon", good: 8, active: 10 },
    { day: "Tue", good: 10, active: 12 },
    { day: "Wed", good: 7, active: 9 },
    { day: "Thu", good: 9, active: 11 },
    { day: "Fri", good: 11, active: 13 }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx("div", { className: "bg-gradient-to-r from-primary to-secondary text-white p-8", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-all", children: [
        /* @__PURE__ */ jsx(ArrowLeft, { className: "w-5 h-5" }),
        "Back to Login"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-[2rem] mb-2", children: "Parent Dashboard" }),
          /* @__PURE__ */ jsxs("p", { className: "text-[1.125rem] opacity-90", children: [
            "Welcome back! Here's how ",
            childName,
            " is doing"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-[3rem]", children: "\u{1F467}" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto p-8", children: [
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8", children: todayBehavior.map((item, index) => /* @__PURE__ */ jsxs(
        motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: index * 0.1 },
          className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
          children: [
            /* @__PURE__ */ jsx("div", { className: "text-[2.5rem] mb-2", children: item.icon }),
            /* @__PURE__ */ jsx("h3", { className: `text-[2rem] mb-1 ${item.color}`, children: item.count }),
            /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: item.label })
          ]
        },
        item.type
      )) }),
      /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-6 mb-8", children: [
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, x: -20 },
            animate: { opacity: 1, x: 0 },
            transition: { delay: 0.4 },
            className: "bg-white rounded-3xl p-8 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
                /* @__PURE__ */ jsx(Calendar, { className: "w-6 h-6 text-primary" }),
                /* @__PURE__ */ jsx("h2", { children: "Today's Summary" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-4 mb-6", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-4 rounded-2xl bg-secondary/10", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsx(TrendingUp, { className: "w-5 h-5 text-secondary" }),
                    /* @__PURE__ */ jsx("span", { className: "text-[0.9375rem]", children: "Overall Behavior" })
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "text-[1.125rem] text-secondary", children: "Excellent" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-4 rounded-2xl bg-primary/10", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsx(Award, { className: "w-5 h-5 text-primary" }),
                    /* @__PURE__ */ jsx("span", { className: "text-[0.9375rem]", children: "Achievements" })
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "text-[1.125rem] text-primary", children: "3 Stars" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-4 rounded-2xl bg-accent", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsx(Clock, { className: "w-5 h-5 text-muted-foreground" }),
                    /* @__PURE__ */ jsx("span", { className: "text-[0.9375rem]", children: "Attendance" })
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "text-[1.125rem] text-secondary", children: "\u2713 Present" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "pt-6 border-t border-border", children: [
                /* @__PURE__ */ jsx("h4", { className: "mb-3", children: "Teacher's Note" }),
                /* @__PURE__ */ jsxs("p", { className: "text-[0.9375rem] text-muted-foreground p-4 bg-[#FEF3C7] rounded-2xl", children: [
                  '"',
                  childName,
                  ' had an excellent day! She participated actively in all lessons and helped her classmates. Very proud of her progress! \u{1F31F}"'
                ] })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, x: 20 },
            animate: { opacity: 1, x: 0 },
            transition: { delay: 0.5 },
            className: "bg-white rounded-3xl p-8 shadow-lg border border-border",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
                /* @__PURE__ */ jsx(TrendingUp, { className: "w-6 h-6 text-primary" }),
                /* @__PURE__ */ jsx("h2", { children: "Weekly Progress" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "flex items-end justify-between gap-3 h-64 mb-6", children: weeklyProgress.map((day, index) => /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col items-center gap-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 w-full", children: [
                  /* @__PURE__ */ jsx(
                    motion.div,
                    {
                      initial: { height: 0 },
                      animate: { height: `${day.active * 8}px` },
                      transition: { delay: 0.6 + index * 0.1 },
                      className: "bg-primary rounded-t-xl w-full",
                      title: `Active: ${day.active}`
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    motion.div,
                    {
                      initial: { height: 0 },
                      animate: { height: `${day.good * 8}px` },
                      transition: { delay: 0.6 + index * 0.1 },
                      className: "bg-secondary rounded-b-xl w-full",
                      title: `Good: ${day.good}`
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx("span", { className: "text-[0.875rem] text-muted-foreground", children: day.day })
              ] }, day.day)) }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-6 text-[0.875rem]", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx("div", { className: "w-4 h-4 rounded bg-primary" }),
                  /* @__PURE__ */ jsx("span", { children: "Active" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx("div", { className: "w-4 h-4 rounded bg-secondary" }),
                  /* @__PURE__ */ jsx("span", { children: "Good Behavior" })
                ] })
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(
        motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.6 },
          className: "bg-white rounded-3xl p-8 shadow-lg border border-border mb-8",
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
              /* @__PURE__ */ jsx(Clock, { className: "w-6 h-6 text-primary" }),
              /* @__PURE__ */ jsx("h2", { children: "Today's Activities" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "space-y-4", children: recentActivities.map((activity, index) => /* @__PURE__ */ jsxs(
              motion.div,
              {
                initial: { opacity: 0, x: -20 },
                animate: { opacity: 1, x: 0 },
                transition: { delay: 0.7 + index * 0.05 },
                className: "flex items-center gap-4 p-5 rounded-2xl hover:bg-accent transition-all",
                children: [
                  /* @__PURE__ */ jsx("div", { className: `w-14 h-14 rounded-2xl ${activity.color} text-white flex items-center justify-center text-[1.5rem] shadow-lg`, children: activity.icon }),
                  /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                    /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem]", children: activity.activity }),
                    /* @__PURE__ */ jsxs("p", { className: "text-[0.875rem] text-muted-foreground flex items-center gap-1 mt-1", children: [
                      /* @__PURE__ */ jsx(Clock, { className: "w-3 h-3" }),
                      activity.time
                    ] })
                  ] })
                ]
              },
              index
            )) })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.8 },
          className: "grid md:grid-cols-2 gap-6",
          children: [
            /* @__PURE__ */ jsx(Link, { to: "/messages", children: /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-br from-primary to-secondary text-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer", children: [
              /* @__PURE__ */ jsx(MessageCircle, { className: "w-12 h-12 mb-4" }),
              /* @__PURE__ */ jsx("h3", { className: "text-[1.5rem] mb-2", children: "Message Teacher" }),
              /* @__PURE__ */ jsx("p", { className: "text-[1rem] opacity-90", children: "Have questions? Send a message to Mrs. Anderson" }),
              /* @__PURE__ */ jsxs("div", { className: "mt-6 inline-flex items-center gap-2 text-[0.9375rem]", children: [
                "View Messages",
                /* @__PURE__ */ jsx("span", { children: "\u2192" })
              ] })
            ] }) }),
            /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-br from-secondary to-[#22C55E]/70 text-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer", children: [
              /* @__PURE__ */ jsx(Award, { className: "w-12 h-12 mb-4" }),
              /* @__PURE__ */ jsx("h3", { className: "text-[1.5rem] mb-2", children: "View Full Report" }),
              /* @__PURE__ */ jsx("p", { className: "text-[1rem] opacity-90", children: "See detailed progress and achievements" }),
              /* @__PURE__ */ jsxs("div", { className: "mt-6 inline-flex items-center gap-2 text-[0.9375rem]", children: [
                "Open Report",
                /* @__PURE__ */ jsx("span", { children: "\u2192" })
              ] })
            ] })
          ]
        }
      )
    ] })
  ] });
}
export {
  ParentDashboard
};
