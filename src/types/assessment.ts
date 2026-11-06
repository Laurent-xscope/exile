import { z } from "zod";

/**
 * Core Assessment Domain Schemas & Types
 */

export const OptionSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1, "Option text cannot be empty"),
  isCorrect: z.boolean(),
  distractorRationale: z.string().optional(),
});

export const QuestionSchema = z.object({
  id: z.string().optional(),
  questionOrder: z.number().optional(),
  question: z.string().min(5, "Question text must be descriptive"),
  options: z.array(OptionSchema).length(4, "Must provide exactly 4 options (A, B, C, D)"),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(3, "Explanation must be provided"),
  conceptTag: z.string().min(1).optional().default("Konsep inti"),
  culturalContext: z.string().optional(),
});

export const QuizSchema = z.object({
  title: z.string().min(3),
  description: z.string(),
  targetGrade: z.string().optional(),
  category: z.string().optional(),
  culturalTheme: z.string().optional(),
  questions: z.array(QuestionSchema).min(1),
});

export type Option = z.infer<typeof OptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
