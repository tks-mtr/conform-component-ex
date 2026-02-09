import { useLoaderData, Link, Form, useSubmit, useSearchParams } from "react-router";
import { departments, employees } from "../data/mock";
import { type EmployeeWithDepartment } from "../models/schema";
import { Combobox } from "../components/ui/combobox-shadcn";
import type { Route } from "./+types/user-list";

// ... (loaderは変更なし) ...

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const departmentId = url.searchParams.get("departmentId");
  const employeeId = url.searchParams.get("employeeId");

  // 1. ユーザー一覧のフィルタリング
  let filteredEmployees = employees;

  if (departmentId) {
    filteredEmployees = filteredEmployees.filter(
      (e) => e.departmentId === departmentId
    );
  }

  if (employeeId) {
    filteredEmployees = filteredEmployees.filter((e) => e.id === employeeId);
  }

  // 2. 画面表示用データの作成（部署情報結合）
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

  // 3. プルダウン用選択肢の生成
  
  // 部署選択肢
  const departmentOptions = departments.map((d) => ({
    label: d.name,
    value: d.id,
  }));

  // 氏名選択肢
  // departmentId が選択されている場合は、その部署の従業員のみを候補にする
  const employeeCandidateSource = departmentId
    ? employees.filter((e) => e.departmentId === departmentId)
    : employees;

  const employeeOptions = employeeCandidateSource.map((e) => ({
    label: e.name,
    value: e.id,
  }));

  return {
    users: usersWithDepartment,
    departmentOptions,
    employeeOptions,
    departmentId,
    employeeId,
  };
}

export default function UserList() {
  const {
    users,
    departmentOptions,
    employeeOptions,
    departmentId,
    employeeId,
  } = useLoaderData<typeof loader>();
  
  const submit = useSubmit();
  const [searchParams] = useSearchParams();

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center p-4 pt-10">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">ユーザー一覧</h1>
          <Link
            to="/assign"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            新規登録
          </Link>
        </div>

        {/* 検索フォーム */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <Form method="get" className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3">
              <Combobox
                label="所属で絞り込み"
                name="departmentId"
                options={departmentOptions}
                value={departmentId || ""}
                onSelect={(value) => {
                  // 所属が変更されたら、FormDataを作成して送信
                  // shadcn/ui版は内部でstate管理しているが、Form送信ロジックは同じ
                  // ただし hidden input の更新を待つ必要はない（onSelectで渡される値を使うため）
                  // form element は取得できないので、親コンポーネントの Form ref を使うか、
                  // 素直に useSubmit に formData を渡す。
                  // ここでは ref がないので document.querySelector も手だが、
                  // 最もReactらしいのは Form に ref をつけること。
                  // しかし簡単のため、ここでは既存のパラメータ + 新しい値 で navigate するのが一番きれいだが
                  // 既存ロジック (submit formData) に合わせるなら:
                  
                  const formData = new FormData();
                  if (value) formData.set("departmentId", value);
                  // employeeId はクリアされる
                  submit(formData);
                }}
                placeholder="所属を選択"
              />
            </div>
            <div className="w-full md:w-1/3">
              <Combobox
                label="氏名で絞り込み"
                name="employeeId"
                options={employeeOptions}
                value={employeeId || ""}
                onSelect={(value) => {
                  const formData = new FormData();
                  if (departmentId) formData.set("departmentId", departmentId);
                  if (value) formData.set("employeeId", value);
                  submit(formData);
                }}
                disabled={employeeOptions.length === 0}
                placeholder="氏名を選択"
              />
            </div>
            <div className="pb-0.5">
               {(departmentId || employeeId) && (
                  <Link 
                    to="/users"
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    条件クリア
                  </Link>
               )}
            </div>
          </Form>
        </div>

        <div className="overflow-x-auto">
          {/* ... (table部分は変更なし) ... */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  氏名
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  所属
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.department?.name || "所属なし"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {user.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              該当するユーザーは見つかりませんでした。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
