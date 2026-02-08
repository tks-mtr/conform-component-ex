
import { startTransition, useActionState, useState, useEffect } from "react";
import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData, useNavigation, useActionData, redirect, useFetcher } from "react-router";
import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod, getZodConstraint } from "@conform-to/zod/v4";
import { assignmentFormSchema, departmentCreateSchema } from "../models/schema";
import { departments, employees } from "../data/mock";
import { Select } from "../components/ui/select";
import { Modal } from "../components/ui/modal";
import { z } from "zod";

export async function loader({ request }: LoaderFunctionArgs) {
  return { departments, employees };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: assignmentFormSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  // Handle successful submission
  // console.log("Form submitted:", submission.value);
  const { departmentId, employeeId } = submission.value;
  return redirect(`/register-complete?departmentId=${departmentId}&employeeId=${employeeId}`);
}

export default function Home() {
  const { departments, employees } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const lastResult = useActionData<typeof action>();

  // Department creation state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fetcher = useFetcher();
  const isAddingDepartment = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setIsModalOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: assignmentFormSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  // Department creation form
  const [createDepartmentForm, createDepartmentFields] = useForm({
    // Use the fetcher's last result for validation feedback
    lastResult: fetcher.data,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: departmentCreateSchema });
    },
  });

  const departmentOptions = departments.map((d) => ({
    label: d.name,
    value: d.id,
  }));

  const employeeOptions = employees.map((e) => ({
    label: e.name,
    value: e.id,
  }));

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          アサイン登録
        </h1>
        
        <Form method="post" id={form.id} onSubmit={form.onSubmit} className="space-y-6">
          <Select
            label="所属"
            name={fields.departmentId.name}
            options={departmentOptions}
            error={fields.departmentId.errors?.join(", ")}
            sideAction={
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors h-full flex items-center justify-center aspect-square"
                    title="所属を追加"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            }
          />

          <Select
            label="氏名"
            name={fields.employeeId.name}
            options={employeeOptions}
            error={fields.employeeId.errors?.join(", ")}
          />

          <button
            type="submit"
            disabled={navigation.state === "submitting"}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {navigation.state === "submitting" ? "送信中..." : "登録"}
          </button>
          
          {/* 
            【Conform vs React Hook Form 比較】
            
            React Hook Form (RHF) で上記と同じ「送信ボタン制御」と「サーバーエラーハンドリング」を実装する場合、
            以下のようなクライアントサイドのロジックを手動で記述する必要があります。

            RHFの実装イメージ:
            ```tsx
            const { 
              handleSubmit, 
              formState: { isSubmitting }, 
              setError 
            } = useForm();

            const onSubmit = async (data) => {
              try {
                // 1. API送信を自分で書く必要がある
                const response = await fetch('/api/submit', { ... });
                const result = await response.json();

                if (!response.ok) {
                   // 2. サーバーからのバリデーションエラーをRHFの形式に手動でマッピングする処理が必要
                   // Conformであれば、Server Actionから返ってきた lastResult を渡すだけで自動的に紐づく
                   Object.keys(result.errors).forEach(key => {
                     setError(key, { message: result.errors[key] });
                   });
                }
              } catch (e) {
                // エラーハンドリング
              }
            };
            
            return (
              <form onSubmit={handleSubmit(onSubmit)}>
                 <button disabled={isSubmitting}>...</button>
              </form>
            )
            ```

            Conform (現在) のメリット:
            1. `handleSubmit` が不要。標準の HTML `<form>` (Remix/RRv7の `<Form>`) の仕組みに乗っかるだけで良い。
            2. 送信状態 (`submitting`) はフレームワーク (`useNavigation`) が管理するため、フォームライブラリ側で管理しなくて良い。
            3. サーバーサイドのバリデーション結果 (`lastResult`) を `useForm` に渡すだけで、フィールドごとのエラー表示が自動で連携される。手動での `setError` が不要。
          */}
        </Form>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="所属を追加"
      >
        <fetcher.Form
            method="post"
            action="/api/department"
            id={createDepartmentForm.id}
            onSubmit={createDepartmentForm.onSubmit}
            className="space-y-4"
        >
            <div>
                <label htmlFor={createDepartmentFields.name.id} className="block text-sm font-medium text-gray-700 mb-1">
                    部署名
                </label>
                <input
                    type="text"
                    name={createDepartmentFields.name.name}
                    id={createDepartmentFields.name.id}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="例: 経理部"
                />
                <div id={createDepartmentFields.name.errorId} className="text-red-500 text-sm mt-1">
                    {createDepartmentFields.name.errors}
                </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
                <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                >
                    キャンセル
                </button>
                <button
                    type="submit"
                    disabled={isAddingDepartment}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isAddingDepartment ? "保存中..." : "保存"}
                </button>
            </div>
        </fetcher.Form>
      </Modal>
    </div>
  );
}
