import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Sidebar } from "../components/Sidebar.jsx";
import { conversations } from "../data/mockData.js";
import { Send, Image, Search, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
function Messages() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const mockMessages = [
    {
      id: "1",
      content: "Hello Mrs. Anderson! How is Emma doing in class?",
      senderId: "1",
      timestamp: new Date(2026, 2, 22, 9, 0),
      isOwn: false
    },
    {
      id: "2",
      content: "Hello! Emma is doing wonderfully. She's very engaged in all activities.",
      senderId: "teacher",
      timestamp: new Date(2026, 2, 22, 9, 15),
      isOwn: true
    },
    {
      id: "3",
      content: "That's great to hear! She really enjoyed the alphabet game yesterday.",
      senderId: "1",
      timestamp: new Date(2026, 2, 22, 9, 30),
      isOwn: false
    },
    {
      id: "4",
      content: "Yes! She scored 100% on it. I'm very proud of her progress this week. \u{1F31F}",
      senderId: "teacher",
      timestamp: new Date(2026, 2, 22, 10, 0),
      isOwn: true
    },
    {
      id: "5",
      content: "Thank you for the update on Emma's progress!",
      senderId: "1",
      timestamp: new Date(2026, 2, 22, 10, 30),
      isOwn: false
    }
  ];
  const [messages] = useState(mockMessages);
  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    setMessageText("");
  };
  const filteredConversations = conversations.filter(
    (conv) => conv.participantName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-background", children: [
    /* @__PURE__ */ jsx(Sidebar, {}),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 flex overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "w-96 bg-white border-r border-border flex flex-col", children: [
        /* @__PURE__ */ jsxs("div", { className: "p-6 border-b border-border", children: [
          /* @__PURE__ */ jsx("h2", { className: "mb-4", children: "Messages" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "Search conversations...",
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: "w-full pl-12 pr-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: filteredConversations.map((conversation) => /* @__PURE__ */ jsx(
          motion.div,
          {
            whileHover: { backgroundColor: "#F3F4F6" },
            onClick: () => setSelectedConversation(conversation),
            className: `p-5 border-b border-border cursor-pointer transition-all ${selectedConversation.id === conversation.id ? "bg-accent" : ""}`,
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
              /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[1.5rem] flex-shrink-0", children: conversation.avatar }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between mb-1", children: [
                  /* @__PURE__ */ jsx("h4", { className: "text-[0.9375rem] truncate pr-2", children: conversation.participantName }),
                  conversation.unreadCount > 0 && /* @__PURE__ */ jsx("div", { className: "w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[0.75rem] flex-shrink-0", children: conversation.unreadCount })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-[0.875rem] text-muted-foreground truncate mb-1", children: conversation.lastMessage }),
                /* @__PURE__ */ jsx("p", { className: "text-[0.75rem] text-muted-foreground", children: conversation.lastMessageTime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true
                }) })
              ] })
            ] })
          },
          conversation.id
        )) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col bg-background", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-white border-b border-border p-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
            /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[1.5rem]", children: selectedConversation.avatar }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { children: selectedConversation.participantName }),
              /* @__PURE__ */ jsx("p", { className: "text-[0.875rem] text-muted-foreground", children: "Active now" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "p-3 hover:bg-accent rounded-2xl transition-all", children: /* @__PURE__ */ jsx(MoreVertical, { className: "w-5 h-5" }) })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto p-6 space-y-4", children: messages.map((message, index) => /* @__PURE__ */ jsx(
          motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: index * 0.05 },
            className: `flex ${message.isOwn ? "justify-end" : "justify-start"}`,
            children: /* @__PURE__ */ jsxs(
              "div",
              {
                className: `max-w-md px-6 py-4 rounded-3xl ${message.isOwn ? "bg-primary text-white rounded-br-md" : "bg-white border border-border rounded-bl-md"}`,
                children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[0.9375rem]", children: message.content }),
                  /* @__PURE__ */ jsx("p", { className: `text-[0.75rem] mt-2 ${message.isOwn ? "text-white/70" : "text-muted-foreground"}`, children: message.timestamp.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                  }) })
                ]
              }
            )
          },
          message.id
        )) }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white border-t border-border p-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-4", children: [
            /* @__PURE__ */ jsx("button", { className: "p-4 hover:bg-accent rounded-2xl transition-all", children: /* @__PURE__ */ jsx(Image, { className: "w-6 h-6 text-muted-foreground" }) }),
            /* @__PURE__ */ jsx("div", { className: "flex-1", children: /* @__PURE__ */ jsx(
              "textarea",
              {
                placeholder: "Type your message...",
                value: messageText,
                onChange: (e) => setMessageText(e.target.value),
                onKeyPress: (e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                },
                rows: 1,
                className: "w-full px-6 py-4 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              }
            ) }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleSendMessage,
                disabled: !messageText.trim(),
                className: "p-4 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                children: /* @__PURE__ */ jsx(Send, { className: "w-6 h-6" })
              }
            )
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-[0.75rem] text-muted-foreground mt-2 ml-16", children: "Press Enter to send, Shift+Enter for new line" })
        ] })
      ] })
    ] })
  ] });
}
export {
  Messages
};
