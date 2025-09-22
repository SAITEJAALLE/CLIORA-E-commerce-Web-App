import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api.js";
import ProductCard from "../components/ProductCard.jsx";
import Pagination from "../components/Pagination.jsx";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Home() {
  const navigate = useNavigate();
  const qs = useQuery();

  // URL is the source of truth
  const page = Math.max(parseInt(qs.get("page") || "1", 10), 1);
  const q = qs.get("q") || "";
  const sort = qs.get("sort") || "new";

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  async function fetchProducts() {
    try {
      const res = await api.get("/products", {
        params: { page, q: q || undefined, sort },
      });

      const { items = [], total: totalCount = 0 } = res.data || {};
      const normalized = Array.isArray(items)
        ? items.map((p) => ({ ...p, id: p?.id ?? p?._id ?? p?.product_id }))
        : [];

      setProducts(normalized);
      setTotal(Number.isFinite(totalCount) ? totalCount : 0);
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
      setTotal(0);
    }
  }

  useEffect(() => { fetchProducts(); }, [page, q, sort]); // eslint-disable-line

  function goToPage(nextPage) {
    const current = new URLSearchParams(window.location.search);
    if (nextPage <= 1) current.delete("page");
    else current.set("page", String(nextPage));
    navigate({ pathname: "/", search: `?${current.toString()}` });
  }

  return (
    <div className="container container--wide">
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id || p.slug || p.name} product={p} />
        ))}
        {!products.length && (
          <p style={{ opacity: 0.7, padding: "1rem" }}>No products found.</p>
        )}
      </div>

      <Pagination
        total={total}
        pageSize={pageSize}
        currentPage={page}
        onPageChange={goToPage}
      />
    </div>
  );
}
