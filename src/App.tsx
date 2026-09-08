import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard3";
import UploadPage from "./pages/UploadPage2";
import ColumnSelectPage from "./pages/ColumnSelectPage";
import ClusterPage from "./pages/ClusterPage";
import AnalysisPage from "./pages/AnalysisPageFinal";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/columns" element={<ColumnSelectPage />} />
        <Route path="/cluster" element={<ClusterPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
      </Route>
    </Routes>
  );
}
