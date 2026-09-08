export default function FileUploader() {
return (
<div className="p-4 border border-gray-700 rounded-lg bg-gray-700 text-gray-300">
<input type="file" className="w-full text-gray-200" />
<p className="text-xs text-gray-400 mt-2">Upload CSV, Excel, or JSON</p>
</div>
);
}