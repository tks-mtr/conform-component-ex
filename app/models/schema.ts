import { z } from "zod";

export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const employeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  departmentId: z.string(),
});

export const assignmentFormSchema = z.object({
  departmentId: z.string().min(1, { message: "所属を選択してください" }),
  employeeId: z.string().min(1, { message: "氏名を選択してください" }),
});

export const departmentCreateSchema = z.object({
  name: z.string().min(1, { message: "部署名を入力してください" }),
});
