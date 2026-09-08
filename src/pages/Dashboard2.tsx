// import Header from "../components/Header";
// import { motion } from "framer-motion";
// import { useNavigate } from "react-router-dom";
// import { useState } from "react";

// export default function Dashboard() {
//   const navigate = useNavigate();
//   const [selected, setSelected] = useState<"static" | "dynamic" | null>(null);

//   const handleSelection = (mode: "static" | "dynamic") => {
//     setSelected(mode);

//     // Navigate to upload screen with selected mode
//     setTimeout(() => {
//       navigate("/upload", { state: { mode } });
//     }, 400);
//   };

//   return (
//     <div className="min-h-screen bg-[#05101c] text-white">
//       <Header />

//       <div className="p-10 max-w-4xl mx-auto">
//         <h2 className="text-3xl font-semibold mb-8">Choose Insight Mode</h2>
//         <p className="text-gray-400 mb-10">
//           Select how you want to generate insights.
//         </p>

//         {/* Mode Options */}
//         <div className="flex gap-8">
//           {/* Static Mode */}
//           <motion.div
//             whileHover={{ scale: 1.05 }}
//             className={`cursor-pointer p-10 w-80 rounded-xl border transition-all
//               ${selected === "static"
//                 ? "border-blue-500 bg-blue-900/40 shadow-md shadow-blue-700/30"
//                 : "border-white/10 bg-[#0b1c2e]/70 hover:bg-blue-900/20"}
//             `}
//             onClick={() => handleSelection("static")}
//           >
//             <h3 className="text-xl font-semibold">Static Insights</h3>
//             <p className="text-sm text-gray-400 mt-3">
//               View predefined and sample-based customer insights.
//             </p>
//           </motion.div>

//           {/* Dynamic Mode */}
//           <motion.div
//             whileHover={{ scale: 1.05 }}
//             className={`cursor-pointer p-10 w-80 rounded-xl border transition-all
//               ${selected === "dynamic"
//                 ? "border-blue-500 bg-blue-900/40 shadow-md shadow-blue-700/30"
//                 : "border-white/10 bg-[#0b1c2e]/70 hover:bg-blue-900/20"}
//             `}
//             onClick={() => handleSelection("dynamic")}
//           >
//             <h3 className="text-xl font-semibold">Dynamic Insights</h3>
//             <p className="text-sm text-gray-400 mt-3">
//               Upload your own dataset to generate insights dynamically.
//             </p>
//           </motion.div>
//         </div>
//       </div>
//     </div>
//   );
// }


import Header from "../components/Header";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";


export default function Dashboard() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"static" | "dynamic" | null>(null);

  // Your Data Dictionary (STATIC + DYNAMIC)
  const dataDictionary = {
    dynamic: {
      avg_monthly_credit_amount: "Average amount of money added to the account each month",
      avg_monthly_withdrawal_amount: "Average amount of money taken out from the account each month",
      avg_monthly_net_flow: "Average difference between money coming in and going out each month",
      monthly_net_flow_variance: "Variation in monthly net flow over time",
      monthly_withdrawal_amount_variance: "Variation in monthly withdrawal amounts across months",
      monthly_credit_amount_variance: "Variation in monthly credit amounts across months",
      avg_monthly_credit_count: "Average number of money-in transactions per month",
      avg_monthly_withdrawal_count: "Average number of money-out transactions per month",
      monthly_withdrawal_count_variance: "Variation in the count of monthly withdrawal transactions",
      monthly_credit_count_variance: "Variation in the count of monthly credit transactions",
      monthly_atm_txn_count: "Average number of ATM transactions per month",
      monthly_web_txn_count: "Average number of online or web-based transactions per month",
      monthly_cash_txn_count: "Average number of cash-based transactions per month",
      monthly_weekday_txn_pct: "Percentage of transactions performed on weekdays",
      monthly_weekend_txn_pct: "Percentage of transactions performed on weekends"
    },

    static: {
      gender: "Customer Gender",
      altbankstatus: "Altbank App Product Status (Yes/No)",
      altmall_status: "Altmall Product Status (Yes/No)",
      age_group: "Age Group of Customer",
      ussdstatus: "USSD Product Status (Yes/No)",
      altbiz_status: "Altbiz Product Status (Yes/No)",
      altdrive_status: "Altdrive Product Status (Yes/No)",
      cardstatus: "Customer Card Status (Yes/No)",
      religion: "Customer Religion",
      rentfinance_status: "rentfinance Product Status (Yes/No)",
      altprostatus: "Altpro Product Status (Yes/No)",
      altpower_status: "Altpower Product Status (Yes/No)",
      marital_status: "Customer Marital Status"
    }
  };

  // Handle Insight Mode Selection
  const handleSelection = (mode: "static" | "dynamic") => {
    setSelected(mode);

    // Navigate to upload with dictionary + mode
    setTimeout(() => {
      navigate("/upload", { state: { mode, dictionary: dataDictionary } });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#05101c] text-white">
      <Header />

      <div className="p-10 max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold mb-8">Choose Insight Mode</h2>
        <p className="text-gray-400 mb-10">Select how you want to generate insights.</p>

  {/* <div className="flex gap-8">
  
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`cursor-pointer p-10 w-[28rem] rounded-xl border transition-all
      ${
        selected === "static"
          ? "border-blue-500 bg-blue-900/40 shadow-md shadow-blue-700/30"
          : "border-white/10 bg-[#0b1c2e]/70 hover:bg-blue-900/20"
      }`}
    onClick={() => handleSelection("static")}
  >
    <h3 className="text-xl font-semibold">Static Insights</h3>
    <p className="text-sm text-gray-400 mt-3">
      View predefined and sample-based customer insights.
    </p>
  </motion.div>

 
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`cursor-pointer p-10 w-[28rem] rounded-xl border transition-all
      ${
        selected === "dynamic"
          ? "border-blue-500 bg-blue-900/40 shadow-md shadow-blue-700/30"
          : "border-white/10 bg-[#0b1c2e]/70 hover:bg-blue-900/20"
      }`}
    onClick={() => handleSelection("dynamic")}
  >
    <h3 className="text-xl font-semibold">Dynamic Insights</h3>
    <p className="text-sm text-gray-400 mt-3">
      Upload your own dataset to generate insights dynamically.
    </p>
  </motion.div>
</div> */}

<div className="flex gap-10">
  {/* Static Insights */}
  <motion.div
    whileHover={{ scale: 1.04, y: -4 }}
    transition={{ duration: 0.25 }}
    className={`cursor-pointer p-10 w-[28rem] rounded-2xl border backdrop-blur-xl
      transition-all shadow-xl
      ${
        selected === "static"
          ? "border-blue-500 bg-gradient-to-br from-[#0a1e33] to-[#0f2942] shadow-blue-800/40"
          : "border-white/10 bg-gradient-to-br from-[#0b1c2e]/70 to-[#0d2336]/60 hover:from-[#12345a] hover:to-[#102b46]"
      }`}
    onClick={() => handleSelection("static")}
  >
    <h3 className="text-2xl font-semibold text-white">Static Insights</h3>
    <p className="text-sm text-gray-300 mt-3 leading-relaxed">
      View predefined and sample-driven customer insights with curated analysis.
    </p>
  </motion.div>

  {/* Dynamic Insights */}
  <motion.div
    whileHover={{ scale: 1.04, y: -4 }}
    transition={{ duration: 0.25 }}
    className={`cursor-pointer p-10 w-[28rem] rounded-2xl border backdrop-blur-xl
      transition-all shadow-xl
      ${
        selected === "dynamic"
          ? "border-blue-500 bg-gradient-to-br from-[#0a1e33] to-[#0f2942] shadow-blue-800/40"
          : "border-white/10 bg-gradient-to-br from-[#0b1c2e]/70 to-[#0d2336]/60 hover:from-[#12345a] hover:to-[#102b46]"
      }`}
    onClick={() => handleSelection("dynamic")}
  >
    <h3 className="text-2xl font-semibold text-white">Dynamic Insights</h3>
    <p className="text-sm text-gray-300 mt-3 leading-relaxed">
      Upload a dataset to generate fully AI-powered adaptive insights.
    </p>
  </motion.div>
</div>

      </div>
    </div>
  );
}
