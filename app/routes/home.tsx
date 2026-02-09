import { Link } from "react-router";

export default function Home() {
  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          メニュー
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/assign"
            className="group block p-6 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 hover:border-blue-200 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-900">アサイン登録</h2>
              <span className="p-2 bg-blue-200 rounded-full group-hover:bg-blue-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
            </div>
            <p className="text-blue-700">新しいアサイン情報を登録します。</p>
          </Link>

          <Link
            to="/users"
            className="group block p-6 bg-green-50 border border-green-100 rounded-xl hover:bg-green-100 hover:border-green-200 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-green-900">ユーザー一覧</h2>
              <span className="p-2 bg-green-200 rounded-full group-hover:bg-green-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
            </div>
            <p className="text-green-700">登録済みユーザーの一覧を表示します。</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
