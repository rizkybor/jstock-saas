import Button from "./Button";

/**
 * Prev/next pager driven by the API's { current_page, last_page, total } meta.
 * Renders nothing when there's only one page.
 */
export default function Pagination({ currentPage, lastPage, total, onPageChange }) {
  if (!lastPage || lastPage <= 1) return null;

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <span className="text-xs text-ink-muted">
        Halaman {currentPage} dari {lastPage}
        {typeof total === "number" && ` · ${total} total data`}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          &larr; Sebelumnya
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Berikutnya &rarr;
        </Button>
      </div>
    </div>
  );
}
