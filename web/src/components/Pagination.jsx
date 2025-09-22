// Simple pagination control. Renders page numbers and previous/next
// controls. Calls onPageChange with the new page number.
function Pagination({ total, pageSize, currentPage, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  return (
    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <button className="button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Prev</button>
      {pages.map((p) => (
        <button
          key={p}
          className="button"
          style={{ backgroundColor: p === currentPage ? '#312e81' : '#4f46e5' }}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button className="button" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</button>
    </div>
  );
}

export default Pagination;