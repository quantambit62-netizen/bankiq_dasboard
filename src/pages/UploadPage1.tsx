import Header from "../components/Header";
import { motion } from "framer-motion";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function UploadPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);

  const [, setFileData] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const inputRefCsv = useRef<HTMLInputElement>(null);
  const inputRefJson = useRef<HTMLInputElement>(null);

  //const [error, setError] = useState("");

  // Column Select States
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showColumnSelect, setShowColumnSelect] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.state?.mode || "static";

  // -----------------------
  // JSON Upload Handler
  // -----------------------
//   const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setJsonFile(file);

//     const text = await file.text();
//     localStorage.setItem("uploadedJSON", text);

//     console.log("✅ JSON dictionary uploaded");
//   };


const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setJsonFile(file);

  const text = await file.text();
  try {
    const json = JSON.parse(text);

    // Save full dictionary
    localStorage.setItem("dataDictionary", JSON.stringify(json));

    console.log("✅ JSON dictionary uploaded");
  } catch {
    console.error("❌ Invalid JSON file");
  }
};


  // -----------------------
  // CSV / XLSX Upload Handler
  // -----------------------
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const file = e.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setUploadProgress(30);

    const reader = new FileReader();

    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (!content) return;

      let parsed: any[] = [];

      // CSV
      if (file.name.endsWith(".csv")) {
        Papa.parse(content as string, {
          header: true,
          complete: (res) => {
            parsed = res.data;
            finalizeUpload(parsed);
          },
        });
      }

      // EXCEL
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

  // -----------------------
  // After Parsing CSV
  // -----------------------
  const STATIC_COLUMNS = [
    "gender",
    "altbankstatus",
    "altmall_status",
    "age_group",
    "ussdstatus",
    "altbiz_status",
    "altdrive_status",
    "cardstatus",
    "religion",
    "rentfinance_status",
    "altprostatus",
    "altpower_status",
    "marital_status",
  ];

  const DYNAMIC_COLUMNS = [
    "avg_monthly_credit_amount",
    "avg_monthly_withdrawal_amount",
    "avg_monthly_net_flow",
    "monthly_net_flow_variance",
    "monthly_withdrawal_amount_variance",
    "monthly_credit_amount_variance",
    "avg_monthly_credit_count",
    "avg_monthly_withdrawal_count",
    "monthly_withdrawal_count_variance",
    "monthly_credit_count_variance",
    "monthly_atm_txn_count",
    "monthly_web_txn_count",
    "monthly_cash_txn_count",
    "monthly_weekday_txn_pct",
    "monthly_weekend_txn_pct",
  ];

  const finalizeUpload = (parsedData: any[]) => {
    setUploadProgress(100);
    setFileData(parsedData);

    localStorage.setItem("uploadedData", JSON.stringify(parsedData));

    if (parsedData.length > 0) {
      const uploadedCols = Object.keys(parsedData[0]).map((c) =>
        c.trim().toLowerCase()
      );

      const allowed =
        mode === "static"
          ? STATIC_COLUMNS.map((c) => c.toLowerCase())
          : DYNAMIC_COLUMNS.map((c) => c.toLowerCase());

      const filteredCols = uploadedCols.filter((col) =>
        allowed.includes(col)
      );

      setColumns(filteredCols);
      setShowColumnSelect(true);
    }
  };

  // -----------------------
  // Column Selection Logic
  // -----------------------
  const toggleColumn = (col: string) => {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedCols(!selectAll ? columns : []);
  };

  const handleSubmit = () => {
    localStorage.setItem("selectedColumns", JSON.stringify(selectedCols));
    localStorage.setItem("insightMode", mode);
    navigate("/analysis", { state: { mode } });
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
          <br></br>
        {/* CSV UPLOAD */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full h-60 border-2 border-dashed border-blue-400 rounded-xl flex flex-col justify-center items-center bg-[#0b1c2e]/60 p-6 cursor-pointer hover:bg-blue-900/20 transition"
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

       

        {/* FILE LIST */}
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

        {/* COLUMN SELECT */}
        {showColumnSelect && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 bg-[#0b1c2e]/60 p-6 rounded-xl border border-white/10"
          >
            <h3 className="text-xl font-semibold mb-4">Select Columns</h3>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
              <span className="text-lg">Select All Columns</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {columns.map((col) => (
                <label key={col} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCols.includes(col)}
                    onChange={() => toggleColumn(col)}
                  />
                  <span>{col}</span>
                </label>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-semibold"
              >
                Submit
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
