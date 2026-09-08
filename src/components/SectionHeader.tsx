interface SectionHeaderProps {
  title: string;
  sub?: string;
}

export default function SectionHeader({ title, sub }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl font-semibold">{title}</h2>
      {sub && <p className="text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
