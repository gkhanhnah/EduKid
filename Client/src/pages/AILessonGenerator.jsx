import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Sidebar } from "../components/Sidebar.jsx";
import { Sparkles, Wand2, BookOpen, FileText } from "lucide-react";
import { motion } from "framer-motion";
function AILessonGenerator() {
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonPlan, setLessonPlan] = useState(null);
  const handleGenerate = () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      const mockLesson = {
        topic,
        objective: `To help Grade 1 students understand and learn about ${topic}`,
        slides: [
          {
            title: `Introduction to ${topic}`,
            content: `Let's explore the wonderful world of ${topic}! This lesson will help you understand the basics in a fun and engaging way.`
          },
          {
            title: "Main Concepts",
            content: `Here are the key things to remember about ${topic}. We'll use pictures, songs, and games to help you learn!`
          },
          {
            title: "Practice Time",
            content: `Now it's your turn! Let's practice what we've learned with some fun activities.`
          },
          {
            title: "Review & Wrap Up",
            content: `Great job! Let's review what we learned today about ${topic}.`
          }
        ],
        exercises: [
          {
            type: "Drawing",
            question: `Draw a picture about ${topic}`
          },
          {
            type: "Matching",
            question: `Match the items related to ${topic}`
          },
          {
            type: "Quiz",
            question: `Answer simple questions about ${topic}`
          }
        ]
      };
      setLessonPlan(mockLesson);
      setIsGenerating(false);
    }, 2e3);
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-background", children: [
    /* @__PURE__ */ jsx(Sidebar, {}),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
        /* @__PURE__ */ jsxs("h1", { className: "mb-2 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "w-10 h-10 text-[#8B5CF6]" }),
          "AI Lesson Generator"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground", children: "Generate engaging lesson plans for Grade 1 students in seconds" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-8 shadow-lg border border-border mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "topic", className: "block mb-3 text-foreground", children: "What topic would you like to teach?" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: "topic",
              type: "text",
              placeholder: "e.g., Letter A, Numbers 1-10, Colors, Shapes...",
              value: topic,
              onChange: (e) => setTopic(e.target.value),
              className: "w-full px-6 py-5 bg-input-background border-2 border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-[1.125rem]",
              onKeyPress: (e) => e.key === "Enter" && handleGenerate()
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleGenerate,
            disabled: !topic.trim() || isGenerating,
            className: "w-full md:w-auto bg-gradient-to-r from-[#8B5CF6] to-primary text-white px-8 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed",
            children: isGenerating ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(
                motion.div,
                {
                  animate: { rotate: 360 },
                  transition: { duration: 1, repeat: Infinity, ease: "linear" },
                  children: /* @__PURE__ */ jsx(Wand2, { className: "w-6 h-6" })
                }
              ),
              "Generating Lesson..."
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Sparkles, { className: "w-6 h-6" }),
              "Generate Lesson Plan"
            ] })
          }
        )
      ] }),
      !lessonPlan && /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-8 shadow-lg border border-border", children: [
        /* @__PURE__ */ jsxs("h3", { className: "mb-6 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(BookOpen, { className: "w-6 h-6 text-primary" }),
          "Popular Topics"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: [
          { topic: "Letter A", icon: "\u{1F170}\uFE0F" },
          { topic: "Numbers 1-10", icon: "\u{1F522}" },
          { topic: "Colors", icon: "\u{1F3A8}" },
          { topic: "Shapes", icon: "\u{1F537}" },
          { topic: "Animals", icon: "\u{1F981}" },
          { topic: "Family", icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}" },
          { topic: "Weather", icon: "\u{1F326}\uFE0F" },
          { topic: "Fruits", icon: "\u{1F34E}" }
        ].map((item) => /* @__PURE__ */ jsxs(
          motion.button,
          {
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.95 },
            onClick: () => setTopic(item.topic),
            className: "p-6 rounded-2xl bg-accent hover:bg-primary hover:text-white transition-all text-center",
            children: [
              /* @__PURE__ */ jsx("div", { className: "text-[3rem] mb-2", children: item.icon }),
              /* @__PURE__ */ jsx("div", { className: "text-[0.9375rem]", children: item.topic })
            ]
          },
          item.topic
        )) })
      ] }),
      lessonPlan && /* @__PURE__ */ jsxs(
        motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          className: "space-y-6",
          children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-r from-[#8B5CF6] to-primary text-white rounded-3xl p-8 shadow-lg", children: [
              /* @__PURE__ */ jsx("h3", { className: "mb-3", children: "Lesson Objective" }),
              /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] opacity-95", children: lessonPlan.objective })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-8 shadow-lg border border-border", children: [
              /* @__PURE__ */ jsxs("h3", { className: "mb-6 flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(FileText, { className: "w-6 h-6 text-primary" }),
                "Lesson Slides (",
                lessonPlan.slides.length,
                ")"
              ] }),
              /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 gap-6", children: lessonPlan.slides.map((slide, index) => /* @__PURE__ */ jsxs(
                motion.div,
                {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { delay: index * 0.1 },
                  className: "p-6 rounded-2xl bg-gradient-to-br from-[#E0E7FF] to-[#FEF3C7] border-2 border-primary/20",
                  children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
                      /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[0.875rem]", children: index + 1 }),
                      /* @__PURE__ */ jsx("h4", { className: "flex-1", children: slide.title })
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: slide.content })
                  ]
                },
                index
              )) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-8 shadow-lg border border-border", children: [
              /* @__PURE__ */ jsxs("h3", { className: "mb-6 flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Sparkles, { className: "w-6 h-6 text-[#F59E0B]" }),
                "Suggested Exercises"
              ] }),
              /* @__PURE__ */ jsx("div", { className: "space-y-4", children: lessonPlan.exercises.map((exercise, index) => /* @__PURE__ */ jsxs(
                motion.div,
                {
                  initial: { opacity: 0, x: -20 },
                  animate: { opacity: 1, x: 0 },
                  transition: { delay: 0.5 + index * 0.1 },
                  className: "flex items-start gap-4 p-6 rounded-2xl bg-accent hover:bg-primary/5 transition-all",
                  children: [
                    /* @__PURE__ */ jsxs("div", { className: "p-3 bg-white rounded-2xl shadow-md", children: [
                      exercise.type === "Drawing" && /* @__PURE__ */ jsx("span", { className: "text-[2rem]", children: "\u270F\uFE0F" }),
                      exercise.type === "Matching" && /* @__PURE__ */ jsx("span", { className: "text-[2rem]", children: "\u{1F517}" }),
                      exercise.type === "Quiz" && /* @__PURE__ */ jsx("span", { className: "text-[2rem]", children: "\u2753" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                      /* @__PURE__ */ jsxs("h4", { className: "mb-2", children: [
                        exercise.type,
                        " Activity"
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem] text-muted-foreground", children: exercise.question })
                    ] })
                  ]
                },
                index
              )) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-4", children: [
              /* @__PURE__ */ jsx("button", { className: "flex-1 bg-primary text-white px-6 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all", children: "Export as PDF" }),
              /* @__PURE__ */ jsx("button", { className: "flex-1 bg-secondary text-white px-6 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all", children: "Share with Parents" }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => {
                    setLessonPlan(null);
                    setTopic("");
                  },
                  className: "bg-muted text-foreground px-6 py-5 rounded-2xl hover:bg-muted/70 transition-all",
                  children: "Generate New"
                }
              )
            ] })
          ]
        }
      )
    ] }) })
  ] });
}
export {
  AILessonGenerator
};
