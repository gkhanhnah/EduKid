import { jsx, jsxs } from "react/jsx-runtime";
import { Sidebar } from "../components/Sidebar.jsx";
import { games } from "../data/mockData.js";
import { Trophy, Clock, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
function Games() {
  const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return { bg: "bg-secondary/10", text: "text-secondary", label: "Easy" };
      case "medium":
        return { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", label: "Medium" };
      case "hard":
        return { bg: "bg-destructive/10", text: "text-destructive", label: "Hard" };
      default:
        return { bg: "bg-muted", text: "text-foreground", label: difficulty };
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-background", children: [
    /* @__PURE__ */ jsx(Sidebar, {}),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
        /* @__PURE__ */ jsx("h1", { className: "mb-2", children: "Game-Based Learning" }),
        /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground", children: "Fun and educational games for Grade 1 students" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-8", children: [
        /* @__PURE__ */ jsx(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
              /* @__PURE__ */ jsx("div", { className: "p-3 bg-primary/10 rounded-2xl", children: /* @__PURE__ */ jsx(Trophy, { className: "w-6 h-6 text-primary" }) }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1", children: games.length }),
                /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Available Games" })
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsx(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.1 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
              /* @__PURE__ */ jsx("div", { className: "p-3 bg-secondary/10 rounded-2xl", children: /* @__PURE__ */ jsx(Star, { className: "w-6 h-6 text-secondary" }) }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1", children: "124" }),
                /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Games Completed" })
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsx(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.2 },
            className: "bg-white rounded-3xl p-6 shadow-lg border border-border",
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
              /* @__PURE__ */ jsx("div", { className: "p-3 bg-[#F59E0B]/10 rounded-2xl", children: /* @__PURE__ */ jsx(Clock, { className: "w-6 h-6 text-[#F59E0B]" }) }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1", children: "2.5h" }),
                /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Total Play Time" })
              ] })
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: games.map((game, index) => {
        const difficultyStyle = getDifficultyStyle(game.difficulty);
        return /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, scale: 0.9 },
            animate: { opacity: 1, scale: 1 },
            transition: { delay: index * 0.1 },
            whileHover: { scale: 1.05 },
            className: "bg-white rounded-3xl shadow-lg border border-border overflow-hidden",
            children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "h-40 flex items-center justify-center text-[5rem]",
                  style: { backgroundColor: `${game.color}15` },
                  children: game.icon
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between mb-3", children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-[1.125rem] flex-1", children: game.title }),
                  /* @__PURE__ */ jsx("div", { className: `px-3 py-1 rounded-full text-[0.75rem] ${difficultyStyle.bg} ${difficultyStyle.text}`, children: difficultyStyle.label })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground mb-6", children: game.description }),
                /* @__PURE__ */ jsxs("div", { className: "flex gap-4 mb-6 pb-6 border-b border-border text-[0.875rem]", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx(Star, { className: "w-4 h-4 text-[#F59E0B]" }),
                    /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "4.8" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx(Trophy, { className: "w-4 h-4 text-primary" }),
                    /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "12 plays" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx(Clock, { className: "w-4 h-4 text-secondary" }),
                    /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "~10 min" })
                  ] })
                ] }),
                /* @__PURE__ */ jsx(Link, { to: `/games/${game.id}`, children: /* @__PURE__ */ jsx(
                  "button",
                  {
                    className: "w-full py-4 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all",
                    style: { backgroundColor: game.color },
                    children: "Start Game"
                  }
                ) })
              ] })
            ]
          },
          game.id
        );
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 bg-white rounded-3xl p-6 shadow-lg border border-border", children: [
        /* @__PURE__ */ jsx("h3", { className: "mb-6", children: "Recent Game Activity" }),
        /* @__PURE__ */ jsx("div", { className: "space-y-4", children: [
          { student: "Emma Wilson", avatar: "\u{1F467}", game: "Alphabet Adventure", score: "100%", time: "10 mins ago" },
          { student: "Liam Chen", avatar: "\u{1F466}", game: "Number Counting", score: "95%", time: "25 mins ago" },
          { student: "Olivia Smith", avatar: "\u{1F467}", game: "Shape Matching", score: "88%", time: "1 hour ago" },
          { student: "Noah Brown", avatar: "\u{1F466}", game: "Color Quiz", score: "92%", time: "2 hours ago" }
        ].map((activity, index) => /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, x: -20 },
            animate: { opacity: 1, x: 0 },
            transition: { delay: 0.5 + index * 0.1 },
            className: "flex items-center gap-4 p-4 rounded-2xl hover:bg-accent transition-all",
            children: [
              /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[1.5rem]", children: activity.avatar }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem]", children: activity.student }),
                /* @__PURE__ */ jsxs("p", { className: "text-[0.875rem] text-muted-foreground", children: [
                  "Played ",
                  activity.game
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-secondary", children: activity.score }),
                /* @__PURE__ */ jsx("p", { className: "text-[0.875rem] text-muted-foreground", children: activity.time })
              ] })
            ]
          },
          index
        )) })
      ] })
    ] }) })
  ] });
}
export {
  Games
};
