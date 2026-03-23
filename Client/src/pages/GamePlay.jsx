import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { games } from "../data/mockData.js";
import { X, Star, Trophy, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
function GamePlay() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const game = games.find((g) => g.id === gameId);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentLetter, setCurrentLetter] = useState("A");
  const [options, setOptions] = useState([]);
  function generateAlphabetQuestion() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomIndex = Math.floor(Math.random() * 26);
    const correctLetter = letters[randomIndex];
    setCurrentLetter(correctLetter);
    const wrongLetters = [];
    while (wrongLetters.length < 3) {
      const wrongIndex = Math.floor(Math.random() * 26);
      const letter = letters[wrongIndex];
      if (letter !== correctLetter && !wrongLetters.includes(letter)) {
        wrongLetters.push(letter);
      }
    }
    const allOptions = [correctLetter, ...wrongLetters].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  }
  useEffect(() => {
    if (gameId === "alphabet") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed question when game/level changes
      generateAlphabetQuestion();
    }
  }, [gameId, level]);
  const handleAnswer = (selectedLetter) => {
    if (selectedLetter === currentLetter) {
      setScore(score + 10);
      setProgress(Math.min(progress + 20, 100));
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      if (progress + 20 >= 100) {
        setTimeout(() => {
          setLevel(level + 1);
          setProgress(0);
        }, 1e3);
      } else {
        setTimeout(() => generateAlphabetQuestion(), 1e3);
      }
    }
  };
  if (!game) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-[4rem] mb-4", children: "\u{1F3AE}" }),
      /* @__PURE__ */ jsx("h2", { children: "Game not found" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => navigate("/games"),
          className: "mt-6 bg-primary text-white px-6 py-3 rounded-2xl",
          children: "Back to Games"
        }
      )
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-gradient-to-br from-[#E0E7FF] via-background to-[#FEF3C7] p-6", children: [
    /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto mb-6", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-3xl p-6 shadow-lg border border-border", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => navigate("/games"),
            className: "p-3 hover:bg-accent rounded-2xl transition-all",
            children: /* @__PURE__ */ jsx(ArrowLeft, { className: "w-6 h-6" })
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Trophy, { className: "w-5 h-5 text-[#F59E0B]" }),
            /* @__PURE__ */ jsxs("span", { className: "text-[1.125rem]", children: [
              "Score: ",
              score
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Star, { className: "w-5 h-5 text-primary" }),
            /* @__PURE__ */ jsxs("span", { className: "text-[1.125rem]", children: [
              "Level ",
              level
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => navigate("/games"),
            className: "p-3 hover:bg-destructive/10 text-destructive rounded-2xl transition-all",
            children: /* @__PURE__ */ jsx(X, { className: "w-6 h-6" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6", children: [
        /* @__PURE__ */ jsx("div", { className: "w-full h-4 bg-muted rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
          motion.div,
          {
            className: "h-full bg-gradient-to-r from-primary to-secondary",
            initial: { width: 0 },
            animate: { width: `${progress}%` },
            transition: { duration: 0.5 }
          }
        ) }),
        /* @__PURE__ */ jsxs("p", { className: "text-center text-[0.875rem] text-muted-foreground mt-2", children: [
          "Level Progress: ",
          progress,
          "%"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto", children: [
      /* @__PURE__ */ jsxs(
        motion.div,
        {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          className: "bg-white rounded-3xl p-12 shadow-2xl border border-border text-center",
          children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
              /* @__PURE__ */ jsx("div", { className: "text-[5rem] mb-4", children: game.icon }),
              /* @__PURE__ */ jsx("h2", { className: "text-[2rem]", children: game.title }),
              /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground mt-2", children: "Click on the letter you hear!" })
            ] }),
            gameId === "alphabet" && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsxs(
                motion.div,
                {
                  initial: { scale: 0 },
                  animate: { scale: 1, rotate: [0, 5, -5, 0] },
                  className: "mb-12",
                  children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: "inline-block text-[8rem] p-12 rounded-[3rem] shadow-2xl cursor-pointer hover:scale-110 transition-all",
                        style: { backgroundColor: `${game.color}20` },
                        children: currentLetter
                      }
                    ),
                    /* @__PURE__ */ jsxs("p", { className: "text-[1.5rem] mt-6 text-muted-foreground", children: [
                      "Find the letter: ",
                      /* @__PURE__ */ jsx("span", { style: { color: game.color }, children: currentLetter })
                    ] })
                  ]
                },
                currentLetter
              ),
              /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto", children: options.map((letter, index) => /* @__PURE__ */ jsx(
                motion.button,
                {
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  transition: { delay: index * 0.1 },
                  whileHover: { scale: 1.1 },
                  whileTap: { scale: 0.9 },
                  onClick: () => handleAnswer(letter),
                  className: "text-[4rem] p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all border-4 border-transparent hover:border-primary",
                  style: { backgroundColor: `${game.color}10` },
                  children: letter
                },
                letter
              )) })
            ] }),
            gameId !== "alphabet" && /* @__PURE__ */ jsxs("div", { className: "py-12", children: [
              /* @__PURE__ */ jsx("div", { className: "text-[6rem] mb-6", children: game.icon }),
              /* @__PURE__ */ jsx("h3", { className: "text-[1.5rem] mb-4", children: "Game Coming Soon!" }),
              /* @__PURE__ */ jsx("p", { className: "text-[1.125rem] text-muted-foreground mb-8", children: "This game is currently under development" }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => navigate("/games"),
                  className: "bg-primary text-white px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all",
                  children: "Back to Games"
                }
              )
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.5 },
          className: "mt-6 bg-white rounded-3xl p-6 shadow-lg border border-border",
          children: [
            /* @__PURE__ */ jsx("h4", { className: "mb-3", children: "How to Play:" }),
            /* @__PURE__ */ jsxs("ul", { className: "text-[0.9375rem] text-muted-foreground space-y-2 list-disc list-inside", children: [
              /* @__PURE__ */ jsx("li", { children: "Look at the large letter shown" }),
              /* @__PURE__ */ jsx("li", { children: "Click on the matching letter from the options below" }),
              /* @__PURE__ */ jsx("li", { children: "Each correct answer gives you 10 points" }),
              /* @__PURE__ */ jsx("li", { children: "Complete the progress bar to advance to the next level" }),
              /* @__PURE__ */ jsx("li", { children: "Have fun learning!" })
            ] })
          ]
        }
      )
    ] })
  ] });
}
export {
  GamePlay
};
