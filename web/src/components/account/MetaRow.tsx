export interface MetaItem {
  label: string
  value: React.ReactNode
}

export default function MetaRow({ items }: { items: MetaItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {items.map((item) => (
        <div key={item.label}>
          <div className="label">{item.label}</div>
          <div className="amount mt-1">{item.value}</div>
        </div>
      ))}
    </div>
  )
}
