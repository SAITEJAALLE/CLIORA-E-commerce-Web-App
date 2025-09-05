-- Seed the database with initial data. Creates an admin user and
-- some default categories and products. Run with "npm run db:seed".

-- Insert admin user if not present. The password hash corresponds to
INSERT INTO users (name, email, role, password_hash)
VALUES ('Admin', 'saitejaalle999@gmail.com', 'admin', '$2b$10$yVn9b8U2K2uGr9YcQdS3mO0K1v1l2lLk8TV0pD3rCCoV7n0r0b2yG')
ON CONFLICT (email) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, slug) VALUES
  ('T-Shirts','t-shirts'),
  ('Mugs','mugs'),
  ('Accessories','accessories')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products
INSERT INTO products (category_id, name, slug, description, price_cents)
VALUES
  ((SELECT id FROM categories WHERE slug='t-shirts'), 'Indigo Tee', 'indigo-tee', 'Soft cotton tee', 1999),
  ((SELECT id FROM categories WHERE slug='mugs'), 'Classic Mug', 'classic-mug', 'Ceramic mug 350ml', 1299),
  ((SELECT id FROM categories WHERE slug='accessories'), 'Canvas Tote', 'canvas-tote', 'Everyday tote', 1599)
ON CONFLICT (slug) DO NOTHING;