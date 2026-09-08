import { PieChart, Pie, Tooltip } from "recharts";


const data = [
{ name: "High Value", value: 35 },
{ name: "Medium Value", value: 45 },
{ name: "Low Value", value: 20 }
];


export default function PieChartComp() {
return (
<PieChart width={300} height={220}>
<Pie
data={data}
dataKey="value"
outerRadius={80}
fill="#3b82f6"
label
/>
<Tooltip />
</PieChart>
);
}