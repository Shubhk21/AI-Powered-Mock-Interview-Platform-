export interface QuestionData {
    question: string;
    timer: number;
    description: string;
  }
  
  export const QUESTIONS: Record<string, QuestionData> = {
    Easy: {
      question: "Two Sum",
      timer: 3,
      description: "Given an array of integers and a target sum, return indices of two numbers that add up to the target."
    },
    Medium: {
      question: "Reverse Linked List",
      timer: 2,
      description: "Reverse a singly linked list in-place."
    },
    Hard: {
      question: "Merge K Sorted Lists",
      timer: 3,
      description: "Merge k sorted linked lists and return it as one sorted list."
    }
  };
