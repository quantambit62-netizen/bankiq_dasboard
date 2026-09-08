import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bgImage from "../assets/bank_bg.jpg"; // update the filename if needed
import { isValidUser } from "../config/authConfig";
import { createSession } from "../config/session";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      if (isValidUser(userId.trim(), password)) {
        const session = createSession(userId.trim());
        console.log("[login] success", { userId: userId.trim(), session });
        setLoading(false);
        navigate("/upload");
        return;
      }
      console.log("[login] failed", { userId: userId.trim() });

      setLoading(false);
      setError("Invalid user ID or password. Please use an authorized account.");
    }, 700);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-[#0B1A30]/80 border border-white/10  
                      rounded-2xl p-10 shadow-2xl backdrop-blur-xl">

        <h1 className="text-3xl font-bold text-blue-400 mb-6 text-center">
          BankIQ - Login
        </h1>

        <p className="text-gray-300 text-center mb-8 text-sm">
          Sign in to access customer analytics dashboard
        </p>

        <form className="space-y-5" onSubmit={handleLogin}>
          {/* Username */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block">User ID</label>
            <input
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0F213F] text-gray-100 
                         border border-white/10 focus:border-blue-500 
                         outline-none transition"
              placeholder="Enter your user ID"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0F213F] text-gray-100 
                         border border-white/10 focus:border-blue-500 
                         outline-none transition"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 
                       text-white font-semibold rounded-xl shadow-lg
                       hover:shadow-blue-700/40 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-gray-300 text-sm">
            New here?{" "}
            <a
              href="/signup"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Create an account
            </a>
          </p>

          <p className="text-gray-400 text-xs">
            © {new Date().getFullYear()} BankIQ Analytics
          </p>
        </div>

      </div>
    </div>
  );
}
