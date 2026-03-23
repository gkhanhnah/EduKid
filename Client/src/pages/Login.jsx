import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
function Login() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState("teacher");
  const handleLogin = (e) => {
    e.preventDefault();
    if (userType === "teacher") {
      navigate("/teacher");
    } else {
      navigate("/parent");
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-gradient-to-br from-[#E0E7FF] via-background to-[#FEF3C7] flex items-center justify-center p-6", children: /* @__PURE__ */ jsxs(
    motion.div,
    {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      className: "w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center md:text-left", children: [
          /* @__PURE__ */ jsx(
            motion.div,
            {
              initial: { scale: 0.8 },
              animate: { scale: 1 },
              transition: { delay: 0.2 },
              className: "text-[8rem] mb-6",
              children: "\u{1F393}"
            }
          ),
          /* @__PURE__ */ jsxs("h1", { className: "text-[2.5rem] mb-4", children: [
            "Welcome to ",
            /* @__PURE__ */ jsx("span", { className: "text-primary", children: "ClassRoom" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground", children: "A friendly classroom management system for Grade 1 teachers and parents" }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-4 mt-6 text-[3rem] justify-center md:justify-start", children: [
            /* @__PURE__ */ jsx(motion.span, { animate: { rotate: [0, 10, -10, 0] }, transition: { repeat: Infinity, duration: 2 }, children: "\u{1F4DA}" }),
            /* @__PURE__ */ jsx(motion.span, { animate: { y: [0, -10, 0] }, transition: { repeat: Infinity, duration: 1.5, delay: 0.2 }, children: "\u270F\uFE0F" }),
            /* @__PURE__ */ jsx(motion.span, { animate: { rotate: [0, -10, 10, 0] }, transition: { repeat: Infinity, duration: 2, delay: 0.4 }, children: "\u{1F3A8}" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          motion.div,
          {
            initial: { opacity: 0, x: 20 },
            animate: { opacity: 1, x: 0 },
            transition: { delay: 0.3 },
            className: "bg-white rounded-3xl shadow-2xl p-8",
            children: [
              /* @__PURE__ */ jsx("h2", { className: "text-center mb-6", children: "Login to Your Account" }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-3 mb-6", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => setUserType("teacher"),
                    className: `flex-1 py-4 rounded-2xl transition-all ${userType === "teacher" ? "bg-primary text-white shadow-lg scale-105" : "bg-muted text-foreground"}`,
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-1", children: "\u{1F468}\u200D\u{1F3EB}" }),
                      /* @__PURE__ */ jsx("div", { className: "text-[0.9375rem]", children: "Teacher" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => setUserType("parent"),
                    className: `flex-1 py-4 rounded-2xl transition-all ${userType === "parent" ? "bg-primary text-white shadow-lg scale-105" : "bg-muted text-foreground"}`,
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[2rem] mb-1", children: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}" }),
                      /* @__PURE__ */ jsx("div", { className: "text-[0.9375rem]", children: "Parent" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("form", { onSubmit: handleLogin, className: "space-y-5", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "block mb-2 text-foreground", children: "Email Address" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      id: "email",
                      type: "email",
                      placeholder: "Enter your email",
                      className: "w-full px-5 py-4 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary",
                      defaultValue: userType === "teacher" ? "teacher@school.com" : "parent@email.com"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { htmlFor: "password", className: "block mb-2 text-foreground", children: "Password" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      id: "password",
                      type: "password",
                      placeholder: "Enter your password",
                      className: "w-full px-5 py-4 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary",
                      defaultValue: "password123"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "submit",
                    className: "w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl",
                    children: [
                      "Login as ",
                      userType === "teacher" ? "Teacher" : "Parent"
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-center text-[0.875rem] text-muted-foreground mt-6", children: "Demo credentials are pre-filled. Just click Login!" })
            ]
          }
        )
      ]
    }
  ) });
}
export {
  Login
};
