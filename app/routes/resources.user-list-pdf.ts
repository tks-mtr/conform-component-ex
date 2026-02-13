import { type LoaderFunctionArgs } from "react-router";
import { departments, employees } from "../data/mock";
import { generateUserListPdf } from "../utils/pdf-generator";
import fs from "fs/promises";
import path from "path";
import subsetFont from "subset-font";
import { type EmployeeWithDepartment } from "../models/schema";

let cachedFontBuffer: Buffer | null = null;

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const departmentId = url.searchParams.get("departmentId");
  const employeeId = url.searchParams.get("employeeId");

  // 1. ユーザー一覧のフィルタリング (user-list.tsxと同じロジック)
  let filteredEmployees = employees;

  if (departmentId) {
    filteredEmployees = filteredEmployees.filter(
      (e) => e.departmentId === departmentId
    );
  }

  if (employeeId) {
    filteredEmployees = filteredEmployees.filter((e) => e.id === employeeId);
  }

  // 2. 部署情報結合
  const usersWithDepartment: EmployeeWithDepartment[] = filteredEmployees.map(
    (employee) => {
      const department = departments.find(
        (d) => d.id === employee.departmentId
      );
      return {
        ...employee,
        department,
      };
    }
  );

  // 3. フォントファイルの読み込み (インメモリキャッシュ - フルセット)
  // process.cwd() はプロジェクトルート (/Users/tks_mtr/work/conform_compornent_ex) を指すはず
  if (!cachedFontBuffer) {
    console.time("font-read-file");
    const fontPath = path.join(process.cwd(), "public/fonts/noto-sans-jp.woff");
    cachedFontBuffer = await fs.readFile(fontPath);
    console.timeEnd("font-read-file");
  }

  // 4. 動的サブセット化 & PDF生成
  console.time("pdf-generation-total");
  
  // PDFに出力する文字を収集
  console.time("font-subset");
  let text = "ユーザー一覧氏名所属ID所なし"; // 固定文言
  for (const user of usersWithDepartment) {
    text += (user.name || "") + (user.department?.name || "") + (user.id || "");
  }
  // 重複除去
  const uniqueChars = Array.from(new Set(text.split(''))).join('');
  
  // サブセット生成
  const subsetBuffer = await subsetFont(cachedFontBuffer, uniqueChars, {
    targetFormat: 'woff',
  });
  console.timeEnd("font-subset");

  const pdfBytes = await generateUserListPdf(usersWithDepartment, subsetBuffer.buffer as ArrayBuffer);
  console.timeEnd("pdf-generation-total");

  // 5. レスポンス返却
  return new Response(pdfBytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="user-list.pdf"',
    },
  });
}
