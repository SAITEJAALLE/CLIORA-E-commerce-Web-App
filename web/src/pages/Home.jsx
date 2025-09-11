import { useState, useEffect } from 'react';
import api from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import Pagination from '../components/Pagination.jsx';

// Home page lists products with search, category filter and sorting.
function Home() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [sort, setSort] = useState('new');

  const [categories, setCategories] = useState([{ slug: '', name: 'All categories' }]);

  const pageSize = 12;

  async function fetchProducts() {
    try {
      const res = await api.get('/products', {
        params: {
          page,
          q: search || undefined,
          category: categorySlug || undefined,
          sort
        }
      });

      // Expected shape from backend:
      // { items: [...], total: number, page: number, pageSize: number, categories: [{name,slug}, ...] }
      const { items = [], total: totalCount = 0, categories: apiCats = [] } = res.data || {};

      setProducts(Array.isArray(items) ? items : []);
      setTotal(Number.isFinite(totalCount) ? totalCount : 0);

      // Load categories once (prepend "All categories")
      if (apiCats?.length && categories.length === 1) {
        setCategories([{ slug: '', name: 'All categories' }, ...apiCats]);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setProducts([]);
      setTotal(0);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categorySlug, sort]);

  const handlePageChange = (p) => setPage(p);

  return (
    <div>
      {/* Filters */}
      <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          value={categorySlug}
          onChange={(e) => {
            setCategorySlug(e.target.value);
            setPage(1);
          }}
        >
          {categories.map((c) => (
            <option key={c.slug || 'all'} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="new">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Product grid */}
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {!products.length && (
          <p style={{ opacity: 0.7, padding: '1rem' }}>No products found.</p>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        total={total}
        pageSize={pageSize}
        currentPage={page}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default Home;
