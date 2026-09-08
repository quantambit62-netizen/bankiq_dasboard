import Header from "../components/Header";
//import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import SectionHeader from "../components/SectionHeader";
import DashboardTile from "../components/DashboardTiles";
import { FiFileText, FiBarChart } from "react-icons/fi";


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
   <div className="min-h-screen bg-gradient-to-br from-[#030a12] via-[#051324] to-[#0B1C2E] text-white">
  <Header />

  <div className="p-10 max-w-6xl mx-auto">
    <SectionHeader
      title="Choose Insight Mode"
      sub="Select how you want to generate insights."
    />

    <div className="flex gap-10">
      <DashboardTile
        title="Static Insights"
        desc="View predefined and sample-driven customer insights."
        selected={selected === "static"}
        icon={<FiFileText />} 
        onClick={() => handleSelection("static")}
      />

      <DashboardTile
        title="Dynamic Insights"
        desc="Upload a dataset to generate fully AI-powered adaptive insights."
        selected={selected === "dynamic"}
        icon={<FiBarChart />}  
        onClick={() => handleSelection("dynamic")}
      />
    </div>
  </div>
</div>
  );
}


