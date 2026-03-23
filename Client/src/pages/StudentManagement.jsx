import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Sidebar } from "../components/Sidebar.jsx";
import { students as initialStudents } from "../data/mockData.js";
import { Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
function StudentManagement() {
  const [students] = useState(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredStudents = students.filter(
    (student) => student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-background", children: [
    /* @__PURE__ */ jsx(Sidebar, {}),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "mb-2", children: "Student Management" }),
          /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground", children: "Manage your Grade 1 classroom students" })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "bg-primary text-white px-6 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 w-fit", children: [
          /* @__PURE__ */ jsx(Plus, { className: "w-5 h-5" }),
          "Add Student"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsxs("div", { className: "relative max-w-md", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            placeholder: "Search students...",
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            className: "w-full pl-12 pr-4 py-4 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-6 shadow-lg border border-border", children: [
          /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-2", children: "\u{1F465}" }),
          /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1", children: students.length }),
          /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Total Students" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-6 shadow-lg border border-border", children: [
          /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-2", children: "\u2705" }),
          /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1 text-secondary", children: students.filter((s) => s.status === "present").length }),
          /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Present Today" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-6 shadow-lg border border-border", children: [
          /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-2", children: "\u274C" }),
          /* @__PURE__ */ jsx("h3", { className: "text-[2rem] mb-1 text-destructive", children: students.filter((s) => s.status === "absent").length }),
          /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: "Absent Today" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", children: filteredStudents.map((student, index) => /* @__PURE__ */ jsxs(
        motion.div,
        {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          transition: { delay: index * 0.05 },
          whileHover: { scale: 1.05 },
          className: "bg-white rounded-3xl p-6 shadow-lg border border-border cursor-pointer hover:shadow-xl transition-all",
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center text-center", children: [
              /* @__PURE__ */ jsx("div", { className: "w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[3rem] mb-4 shadow-lg", children: student.avatar }),
              /* @__PURE__ */ jsx("h4", { className: "mb-2", children: student.name }),
              /* @__PURE__ */ jsx("div", { className: `px-4 py-2 rounded-full text-[0.875rem] ${student.status === "present" ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"}`, children: student.status === "present" ? "\u2713 Present" : "\u2717 Absent" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-6 pt-6 border-t border-border", children: /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-center", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "text-[1.5rem] text-secondary", children: "\u{1F44D}" }),
                /* @__PURE__ */ jsx("div", { className: "text-[0.75rem] text-muted-foreground mt-1", children: "Good" }),
                /* @__PURE__ */ jsx("div", { className: "text-[0.875rem]", children: "8" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "text-[1.5rem] text-primary", children: "\u2B50" }),
                /* @__PURE__ */ jsx("div", { className: "text-[0.75rem] text-muted-foreground mt-1", children: "Active" }),
                /* @__PURE__ */ jsx("div", { className: "text-[0.875rem]", children: "12" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "text-[1.5rem] text-destructive", children: "\u{1F44E}" }),
                /* @__PURE__ */ jsx("div", { className: "text-[0.75rem] text-muted-foreground mt-1", children: "Bad" }),
                /* @__PURE__ */ jsx("div", { className: "text-[0.875rem]", children: "2" })
              ] })
            ] }) })
          ]
        },
        student.id
      )) })
    ] }) })
  ] });
}
export {
  StudentManagement
};
