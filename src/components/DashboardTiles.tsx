import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface DashboardTileProps {
  title: string;
  desc: string;
  selected: boolean;
  icon: ReactNode;     
  onClick: () => void;
}

export default function DashboardTile({
  title,
  desc,
  selected,
  icon,
  onClick,
}: DashboardTileProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4 }}
      transition={{ duration: 0.25 }}
      className={`cursor-pointer p-10 w-[30rem] rounded-2xl border 
        backdrop-blur-xl transition-all shadow-xl
        ${
          selected
            ? "border-blue-500 bg-gradient-to-br from-[#0a1e33] to-[#10395a] shadow-blue-800/40"
            : "border-white/10 bg-gradient-to-br from-[#0b1c2e]/70 to-[#102b46]/60 hover:from-[#12345a] hover:to-[#0e3557]"
        }`}
      onClick={onClick}
    >
     {/* ICON */}
      <div className="text-blue-400 text-5xl flex items-start mt-1">
        {icon}
      </div>   
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="text-sm text-gray-300 mt-3 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
