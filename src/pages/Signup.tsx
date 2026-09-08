import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Fake signup delay
    setTimeout(() => {
      setLoading(false);
      navigate("/upload");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E8F0FF] px-6">
      {/* Card */}
      <div className="w-full max-w-lg bg-white border border-gray-200 shadow-2xl rounded-2xl p-10">
        <h1 className="text-3xl text-[#0A1A2F] font-bold text-center mb-4">
          Create Your Account
        </h1>

        <p className="text-gray-600 text-center mb-8">
          Register to access the banking analytics dashboard
        </p>

        <form className="space-y-5" onSubmit={handleSignup}>
          <div>
            <label className="text-gray-700 text-sm block mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-800 
                        border border-gray-300 focus:border-blue-500 
                        outline-none transition"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="text-gray-700 text-sm block mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-800 
                        border border-gray-300 focus:border-blue-500 
                        outline-none transition"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="text-gray-700 text-sm block mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-800 
                        border border-gray-300 focus:border-blue-500 
                        outline-none transition"
              placeholder="Create a password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white 
                       font-semibold rounded-xl shadow-lg transition 
                       disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Already have an account?{" "}
          <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            Login
          </a>
        </p>

        <p className="text-gray-400 text-xs text-center mt-6">
          © {new Date().getFullYear()} Alt Bank Analytics
        </p>
      </div>
    </div>
  );
}
