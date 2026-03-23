const students = [
  { id: "1", name: "Emma Wilson", avatar: "\u{1F467}", status: "present", behaviors: [] },
  { id: "2", name: "Liam Chen", avatar: "\u{1F466}", status: "present", behaviors: [] },
  { id: "3", name: "Olivia Smith", avatar: "\u{1F467}", status: "present", behaviors: [] },
  { id: "4", name: "Noah Brown", avatar: "\u{1F466}", status: "present", behaviors: [] },
  { id: "5", name: "Ava Martinez", avatar: "\u{1F467}", status: "absent", behaviors: [] },
  { id: "6", name: "Lucas Davis", avatar: "\u{1F466}", status: "present", behaviors: [] },
  { id: "7", name: "Sophia Garcia", avatar: "\u{1F467}", status: "present", behaviors: [] },
  { id: "8", name: "Mason Lee", avatar: "\u{1F466}", status: "present", behaviors: [] },
  { id: "9", name: "Isabella Taylor", avatar: "\u{1F467}", status: "present", behaviors: [] },
  { id: "10", name: "Ethan White", avatar: "\u{1F466}", status: "present", behaviors: [] },
  { id: "11", name: "Mia Johnson", avatar: "\u{1F467}", status: "present", behaviors: [] },
  { id: "12", name: "James Anderson", avatar: "\u{1F466}", status: "present", behaviors: [] }
];
const games = [
  {
    id: "alphabet",
    title: "Alphabet Adventure",
    description: "Learn letters A-Z with fun animations",
    difficulty: "easy",
    icon: "\u{1F524}",
    color: "#4F46E5"
  },
  {
    id: "counting",
    title: "Number Counting",
    description: "Count from 1 to 20 with cute animals",
    difficulty: "easy",
    icon: "\u{1F522}",
    color: "#22C55E"
  },
  {
    id: "matching",
    title: "Shape Matching",
    description: "Match shapes and colors together",
    difficulty: "medium",
    icon: "\u{1F537}",
    color: "#F59E0B"
  },
  {
    id: "colors",
    title: "Color Quiz",
    description: "Identify different colors",
    difficulty: "easy",
    icon: "\u{1F3A8}",
    color: "#8B5CF6"
  },
  {
    id: "animals",
    title: "Animal Sounds",
    description: "Learn animal names and sounds",
    difficulty: "easy",
    icon: "\u{1F981}",
    color: "#EF4444"
  },
  {
    id: "words",
    title: "Word Builder",
    description: "Build simple 3-letter words",
    difficulty: "medium",
    icon: "\u{1F4DD}",
    color: "#06B6D4"
  }
];
const conversations = [
  {
    id: "1",
    participantName: "Mrs. Sarah Johnson (Emma's Mom)",
    participantType: "parent",
    lastMessage: "Thank you for the update on Emma's progress!",
    lastMessageTime: new Date(2026, 2, 22, 10, 30),
    unreadCount: 0,
    avatar: "\u{1F469}"
  },
  {
    id: "2",
    participantName: "Mr. David Chen (Liam's Dad)",
    participantType: "parent",
    lastMessage: "Can we schedule a meeting to discuss Liam's behavior?",
    lastMessageTime: new Date(2026, 2, 21, 14, 15),
    unreadCount: 2,
    avatar: "\u{1F468}"
  },
  {
    id: "3",
    participantName: "Ms. Maria Garcia (Sophia's Mom)",
    participantType: "parent",
    lastMessage: "Sophia loved the alphabet game today!",
    lastMessageTime: new Date(2026, 2, 20, 16, 45),
    unreadCount: 0,
    avatar: "\u{1F469}"
  }
];
export {
  conversations,
  games,
  students
};
