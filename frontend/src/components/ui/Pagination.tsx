interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

function pageItems(page: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const start = Math.max(2, Math.min(page - 1, pageCount - 4));
  const end = Math.min(pageCount - 1, Math.max(page + 1, 5));
  const items: Array<number | 'gap'> = [1];
  if (start > 2) {
    items.push('gap');
  }
  for (let value = start; value <= end; value += 1) {
    items.push(value);
  }
  if (end < pageCount - 1) {
    items.push('gap');
  }
  items.push(pageCount);
  return items;
}

export default function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <span>
        显示第 {from}-{to} 条，共 {total} 条
      </span>
      <div className="pagination-controls">
        <button type="button" className="page-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ‹
        </button>
        {pageItems(page, pageCount).map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="page-gap">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`page-button${item === page ? ' active' : ''}`}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className="page-button"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}
