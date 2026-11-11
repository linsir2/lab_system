export default function Spinner({ label = '加载中' }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span />
      {label}
    </div>
  );
}
