import { useNavigate } from "react-router-dom";
import { endSession, getSessionUser } from "../config/session";

export default function Header({ username = "User123" }) {
  const navigate = useNavigate();
  const currentUser = getSessionUser() || username;

  const handleSignOut = () => {
    console.log("[header] sign out", { user: currentUser });
    endSession();
    navigate("/");
  };

  return (
    <header className="w-full bg-[#071427]/80 border-b border-white/10 p-4 px-8 flex items-center justify-between backdrop-blur">
      <h1 className="text-xl font-semibold text-white tracking-wide flex items-center gap-2">
        <i className="fas fa-chart-line text-blue-300"></i>
        Analytics Dashboard
      </h1>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm text-gray-300">Signed in as</div>
          <div className="font-semibold text-white">{currentUser}</div>
        </div>

        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
