export default function StatusBadge({ status }) {
  const label = {
    live: 'Live',
    finished: 'Finished',
    upcoming: 'Upcoming',
    draft: 'Draft'
  };
  return (
    <span className={`badge badge-${status}`}>
      {label[status] || status}
    </span>
  );
}
