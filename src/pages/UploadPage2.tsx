import Header from "../components/Header";
import { motion } from "framer-motion";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser, getSessionId } from "../config/session";

export default function UploadPage() {
  // Files
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);

  // Parsed data + progress
  const [, setFileData] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Inputs
  const inputRefCsv = useRef<HTMLInputElement>(null);
  const inputRefJson = useRef<HTMLInputElement>(null);
  const [customerIdColumn, setCustomerIdColumn] = useState<string>(
    localStorage.getItem("customerIdColumn") || ""
  );

  const navigate = useNavigate();

  // JSON dictionary upload
  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonFile(file);

    const text = await file.text();
    try {
      const json = JSON.parse(text);
      localStorage.setItem("dataDictionary", JSON.stringify(json));
      console.log("✅ JSON dictionary uploaded");
      await uploadToS3(file);
    } catch {
      console.error("❌ Invalid JSON file");
    }
  };

  // CSV/XLSX upload
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (!file) return;

    setCsvFile(file);
    localStorage.setItem("uploadedFileName", file.name);
    setUploadProgress(30);
    uploadToS3(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (!content) return;

      let parsed: any[] = [];

      // CSV
      if (file.name.endsWith(".csv")) {
        Papa.parse(content as string, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            parsed = res.data;
            finalizeUpload(parsed);
          },
        });
      }

      // Excel
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const workbook = XLSX.read(content, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsed = XLSX.utils.sheet_to_json(sheet);
        finalizeUpload(parsed);
      }
    };

    if (file.name.endsWith(".csv")) reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  // S3 upload via presigned URL
  const uploadToS3 = async (file: File) => {
    const user = getSessionUser() || "anonymous";
    const session = getSessionId() || `session-${Date.now()}`;
    const s3Key = `${user}/sessions/${session}/input/${file.name}`;

    try {
      console.log("[uploadToS3] target path:", s3Key);
      const res = await fetch(
        "https://i9rdy53so7.execute-api.ap-south-1.amazonaws.com/getPresignedUrl",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: s3Key, contentType: file.type }),
        }
      );

      const { uploadUrl, s3_bucket, s3_key } = await res.json();
      console.log("result from presignedurl:", uploadUrl, s3_bucket, s3_key);

      // Important: Content-Type must match what Lambda signed
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      console.log("✅ Uploaded to S3:", s3_bucket, s3_key);
      localStorage.setItem("s3_key", s3_key);
      localStorage.setItem("s3_path", `s3://${s3_bucket}/${s3_key}`);
    } catch (err) {
      console.error("❌ Error uploading to S3:", err);
    }
  };

  // After parsing CSV/XLSX
  const finalizeUpload = (parsedData: any[]) => {
    setUploadProgress(100);
    setFileData(parsedData);
    localStorage.setItem("uploadedData", JSON.stringify(parsedData));

    if (parsedData.length > 0) {
      const uploadedCols = Object.keys(parsedData[0]).map((c) =>
        c.trim().toLowerCase()
      );
      localStorage.setItem("selectedColumns", JSON.stringify(uploadedCols));
      const storedCustomerId = localStorage.getItem("customerIdColumn") || "";
      if (!storedCustomerId) {
        setCustomerIdColumn("");
      }
    }
  };

  // Submit → persist + navigate
  const handleSubmit = () => {
    if (!csvFile || uploadProgress !== 100 || customerIdColumn.trim() === "") return;
    localStorage.setItem("customerIdColumn", customerIdColumn.trim());
    localStorage.removeItem("insightMode");
    navigate("/cluster");
  };

  return (
    <div className="min-h-screen bg-[#05101c] text-white">
      <Header />

      <div className="p-10 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-8">Upload Dataset</h2>

        {/* JSON UPLOAD */}
        <div className="mt-6 p-4 rounded bg-[#0b1c2e]/60 border border-white/10">
          <p className="text-md font-semibold mb-2">Upload Data Dictionary (JSON)</p>
          <div
            className="p-4 border border-dashed border-blue-400 rounded-lg cursor-pointer hover:bg-blue-900/20 transition"
            onClick={() => inputRefJson.current?.click()}
          >
            <p className="text-gray-300">Click to upload JSON file</p>
          </div>
          <input
            type="file"
            className="hidden"
            ref={inputRefJson}
            accept=".json"
            onChange={handleJsonUpload}
          />
          {jsonFile && (
            <p className="mt-3 text-sm text-blue-400">✅ {jsonFile.name}</p>
          )}
        </div>

        {/* CSV/Excel UPLOAD */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full h-60 border-2 border-dashed border-blue-400 rounded-xl flex flex-col justify-center items-center bg-[#0b1c2e]/60 p-6 cursor-pointer hover:bg-blue-900/20 transition mt-6"
          onClick={() => inputRefCsv.current?.click()}
        >
          <p className="text-lg text-gray-300">Upload CSV / Excel File</p>
          <button className="mt-3 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
            Choose File
          </button>
          <input
            type="file"
            className="hidden"
            ref={inputRefCsv}
            accept=".csv,.xlsx,.xls"
            onChange={handleCsvUpload}
          />
        </motion.div>

        {/* FILE LIST + PROGRESS */}
        {csvFile && (
          <div className="mt-6 p-4 rounded bg-[#0b1c2e]/60 border border-white/10">
            <h4 className="text-md font-semibold mb-2">Uploaded CSV/Excel</h4>
            <p className="text-gray-300 text-sm">📄 {csvFile.name}</p>
            {uploadProgress > 0 && (
              <div className="w-full bg-gray-700 h-2 rounded mt-3">
                <div
                  className="h-2 bg-blue-500 rounded transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {csvFile && uploadProgress === 100 && (
          <div className="mt-10 space-y-4">
            <div className="bg-[#0b1c2e]/60 p-6 rounded-xl border border-white/10">
              <label className="block text-sm font-semibold text-white mb-2">
                Customer ID Column Name
              </label>
              <input
                type="text"
                value={customerIdColumn}
                onChange={(e) => setCustomerIdColumn(e.target.value)}
                placeholder="Enter unique customer id column name"
                className="w-full rounded-lg border border-white/20 bg-[#07141f] px-4 py-3 text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
              {customerIdColumn.trim() === "" && (
                <p className="mt-2 text-sm text-rose-300">
                  This field is required before proceeding to clustering.
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={customerIdColumn.trim() === ""}
                className={`px-6 py-2 rounded-lg text-white font-semibold transition ${
                  customerIdColumn.trim() === ""
                    ? "bg-slate-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Proceed to Cluster
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
