type TechnologyStatusChartProps = {
  items: Array<{ status: string }>;
};

export function TechnologyStatusChart({ items }: TechnologyStatusChartProps) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.status, (counts.get(item.status) || 0) + 1);
  const data = [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count || left.status.localeCompare(right.status));
  const maximum = Math.max(1, ...data.map(({ count }) => count));

  return (
    <figure className="technology-status-bars" aria-label="Technology decisions by status">
      <ul>
        {data.map(({ status, count }) => (
          <li key={status}>
            <div><span>{status}</span><strong>{count}</strong></div>
            <span className="technology-status-track" aria-hidden="true"><i style={{ width: `${Math.max(5, count / maximum * 100)}%` }} /></span>
          </li>
        ))}
      </ul>
      <figcaption>{items.length} tracked technology decisions</figcaption>
    </figure>
  );
}
