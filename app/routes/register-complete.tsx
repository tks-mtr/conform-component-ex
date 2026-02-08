import { useSearchParams, Link } from "react-router";
import { departments, employees } from "../data/mock";

export default function RegisterComplete() {
  const [searchParams] = useSearchParams();
  const departmentId = searchParams.get("departmentId");
  const employeeId = searchParams.get("employeeId");

  const department = departments.find((d) => d.id === departmentId);
  const employee = employees.find((e) => e.id === employeeId);

  if (!departmentId || !employeeId || !department || !employee) {
    return (
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
                <h1 className="text-xl font-bold text-red-600 mb-4">エラー</h1>
                <p className="text-gray-700 mb-6">登録情報が見つかりませんでした。</p>
                <Link to="/" className="text-blue-600 hover:underline">TOPへ戻る</Link>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
            登録が完了しました。
            </h1>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <table className="w-full text-left">
                <tbody>
                    <tr className="border-b border-gray-200">
                        <th className="py-2 pr-4 font-medium text-gray-600">所属</th>
                        <td className="py-2 text-gray-900">{department.name}</td>
                    </tr>
                    <tr>
                        <th className="py-2 pr-4 font-medium text-gray-600">氏名</th>
                        <td className="py-2 text-gray-900">{employee.name}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <Link
            to="/"
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
            TOPへ戻る
        </Link>
      </div>
    </div>
  );
}
