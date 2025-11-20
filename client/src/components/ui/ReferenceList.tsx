import { useState } from "react";

interface ReferenceInfo {
  id: string;
  type: "ref" | "sfn";
  preview?: string;
}

interface ReferenceListProps {
  wikipediaUrl: string;
  onSelectReference: (refId: string) => void;
}

export function ReferenceList({
  wikipediaUrl,
  onSelectReference,
}: ReferenceListProps) {
  const [references, setReferences] = useState<ReferenceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [articleTitle, setArticleTitle] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const itemsPerPage = 20;

  const loadReferences = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/list-references?url=${encodeURIComponent(wikipediaUrl)}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load references");
      }

      const data = await response.json();
      setReferences(data.references);
      setArticleTitle(data.articleTitle);
      setCurrentPage(1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load references",
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter references based on search term
  const filteredReferences = references.filter(
    (ref) =>
      ref.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.preview?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredReferences.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReferences = filteredReferences.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (references.length === 0 && !loading && !error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Step 1: Load References</h2>
        <p className="text-gray-600 mb-4">
          First, load all references from the Wikipedia article to select which
          one to verify.
        </p>
        <button
          onClick={loadReferences}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Load References
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-2">
        Select a Reference to Verify
      </h2>
      {articleTitle && (
        <p className="text-gray-600 mb-4">
          Article: <span className="font-medium">{articleTitle}</span>
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading references...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadReferences}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && references.length > 0 && (
        <>
          {/* Search bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search references..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Reference count */}
          <p className="text-sm text-gray-600 mb-4">
            Showing {startIndex + 1}-
            {Math.min(endIndex, filteredReferences.length)} of{" "}
            {filteredReferences.length} references
            {searchTerm && ` (filtered from ${references.length} total)`}
          </p>

          {/* References list */}
          <div className="space-y-2 mb-4">
            {paginatedReferences.map((ref) => (
              <button
                key={ref.id}
                onClick={() => onSelectReference(ref.id)}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                        {ref.id}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {ref.type}
                      </span>
                    </div>
                    {ref.preview && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        ...{ref.preview}
                      </p>
                    )}
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                {/* Page numbers */}
                {[...Array(totalPages)].map((_, idx) => {
                  const pageNum = idx + 1;
                  // Show first page, last page, current page, and pages around current
                  const showPage =
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - currentPage) <= 1;

                  // Show ellipsis
                  const showEllipsisBefore =
                    pageNum === currentPage - 2 && currentPage > 3;
                  const showEllipsisAfter =
                    pageNum === currentPage + 2 && currentPage < totalPages - 2;

                  if (showEllipsisBefore || showEllipsisAfter) {
                    return (
                      <span key={pageNum} className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }

                  if (!showPage) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 text-sm font-medium rounded-lg ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {/* Reload button */}
          <button
            onClick={loadReferences}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Reload references
          </button>
        </>
      )}
    </div>
  );
}
