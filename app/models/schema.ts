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

// 画面表示用：ユーザー情報に所属情報を結合した型
export type EmployeeWithDepartment = z.infer<typeof employeeSchema> & {
  department: z.infer<typeof departmentSchema> | undefined;
};

export const assignmentFormSchema = z.object({
  departmentId: z.string().min(1, { message: "所属を選択してください" }),
  employeeId: z.string().min(1, { message: "氏名を選択してください" }),
});

export const departmentCreateSchema = z.object({
  name: z.string().min(1, { message: "部署名を入力してください" }),
});
