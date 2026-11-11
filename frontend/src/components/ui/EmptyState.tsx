export default function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-dot" />
      <p>{text}</p>
    </div>
  );
}
