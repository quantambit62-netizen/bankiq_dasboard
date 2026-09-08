import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function uploadFileToAPI(file: File) {
  const form = new FormData();
  form.append("file", file);

  const resp = await axios.post(`${API_BASE}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });

  return resp.data;
}
