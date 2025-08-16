export default function LoginPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-white mb-6">Login</h1>
        <form>
          <div className="mb-4">
            <label className="block text-white mb-2" htmlFor="email">Email</label>
            <input type="email" id="email" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="mb-6">
            <label className="block text-white mb-2" htmlFor="password">Password</label>
            <input type="password" id="password" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">Login</button>
        </form>
      </div>
    </div>
  );
}