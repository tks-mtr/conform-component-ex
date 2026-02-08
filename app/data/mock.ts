
import type { z } from "zod";
import { departmentSchema, employeeSchema } from "../models/schema";

type Department = z.infer<typeof departmentSchema>;
type Employee = z.infer<typeof employeeSchema>;

export const departments: Department[] = [
  { id: "dept-1", name: "開発部" },
  { id: "dept-2", name: "営業部" },
  { id: "dept-3", name: "人事部" },
];

export const employees: Employee[] = [
  { id: "emp-1", name: "佐藤 太郎", departmentId: "dept-1" },
  { id: "emp-2", name: "鈴木 次郎", departmentId: "dept-1" },
  { id: "emp-3", name: "田中 三郎", departmentId: "dept-2" },
  { id: "emp-4", name: "高橋 花子", departmentId: "dept-2" },
  { id: "emp-5", name: "伊藤 四郎", departmentId: "dept-3" },
];

export function addDepartment(name: string) {
  const newId = `dept-${departments.length + 1}`;
  const newDepartment: Department = { id: newId, name };
  departments.push(newDepartment);
  return newDepartment;
}
