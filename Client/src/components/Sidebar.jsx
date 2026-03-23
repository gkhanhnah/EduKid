import { jsx, jsxs } from "react/jsx-runtime";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Activity, Gamepad2, Sparkles, MessageCircle, LogOut } from "lucide-react";
function Sidebar() {
  const location = useLocation();
  const navItems = [
    { path: "/teacher", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/students", icon: Users, label: "Students" },
    { path: "/behavior", icon: Activity, label: "Behavior Tracking" },
    { path: "/behavior-history", icon: Activity, label: "Behavior History" },
    { path: "/games", icon: Gamepad2, label: "Games" },
    { path: "/ai-lesson", icon: Sparkles, label: "AI Lesson Generator" },
    { path: "/messages", icon: MessageCircle, label: "Messages" }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "w-64 bg-white border-r border-border h-screen flex flex-col", children: [
    /* @__PURE__ */ jsxs("div", { className: "p-6 border-b border-border", children: [
      /* @__PURE__ */ jsxs("h2", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "text-[2rem]", children: "\u{1F392}" }),
        /* @__PURE__ */ jsx("span", { className: "text-primary", children: "ClassRoom" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-[0.875rem] text-muted-foreground mt-1", children: "Grade 1 Management" })
    ] }),
    /* @__PURE__ */ jsx("nav", { className: "flex-1 p-4 space-y-2", children: navItems.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.path;
      return /* @__PURE__ */ jsxs(
        Link,
        {
          to: item.path,
          className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? "bg-primary text-white shadow-lg" : "text-foreground hover:bg-accent"}`,
          children: [
            /* @__PURE__ */ jsx(Icon, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsx("span", { className: "text-[0.9375rem]", children: item.label })
          ]
        },
        item.path
      );
    }) }),
    /* @__PURE__ */ jsx("div", { className: "p-4 border-t border-border", children: /* @__PURE__ */ jsxs(
      Link,
      {
        to: "/",
        className: "flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all",
        children: [
          /* @__PURE__ */ jsx(LogOut, { className: "w-5 h-5" }),
          /* @__PURE__ */ jsx("span", { className: "text-[0.9375rem]", children: "Logout" })
        ]
      }
    ) })
  ] });
}
export {
  Sidebar
};
