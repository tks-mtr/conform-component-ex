import { type ActionFunctionArgs, data } from "react-router";
import { parseWithZod } from "@conform-to/zod/v4";
import { departmentCreateSchema } from "../models/schema";
import { addDepartment } from "../data/mock";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: departmentCreateSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const newDepartment = addDepartment(submission.value.name);

  return data({ success: true, department: newDepartment });
}
