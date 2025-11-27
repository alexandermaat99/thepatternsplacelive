-- Lowercase all existing category names for consistency
-- Run this to update existing categories to lowercase

UPDATE categories
SET name = LOWER(name),
    slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE name != LOWER(name);

-- Verify the changes
SELECT id, name, slug FROM categories ORDER BY name;

