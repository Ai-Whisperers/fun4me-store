#!/usr/bin/env python3
"""
Update all product image URLs to use the placeholder image.
This fixes broken external image references.
"""

import json
import re
from pathlib import Path


def update_product_images(products_dir: Path, placeholder_url: str = "/placeholder-product.svg"):
    """Update all product image URLs in seed data files."""

    updated_files = []

    for json_file in products_dir.glob("products-*.json"):
        print(f"Processing: {json_file.name}")

        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        modified = False
        products = data.get('products', [])

        for product in products:
            if 'image_url' in product and product['image_url'] != placeholder_url:
                product['image_url'] = placeholder_url
                modified = True

        if modified:
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write('\n')
            updated_files.append(json_file.name)
            print(f"  Updated {len(products)} products")
        else:
            print(f"  No changes needed")

    return updated_files


def update_category_images(categories_file: Path, placeholder_url: str = "/placeholder-product.svg"):
    """Update category image URLs recursively."""

    with open(categories_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    def update_category(cat):
        if 'image_url' in cat:
            cat['image_url'] = placeholder_url
        for subcat in cat.get('subcategories', []):
            update_category(subcat)

    for category in data.get('categories', []):
        update_category(category)

    with open(categories_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"Updated: {categories_file.name}")


def update_pet_photos(pets_file: Path, placeholder_url: str = "/placeholder-product.svg"):
    """Update pet photo URLs."""

    with open(pets_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    pets = data.get('pets', [])
    for pet in pets:
        if 'photo_url' in pet:
            pet['photo_url'] = placeholder_url

    with open(pets_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"Updated {len(pets)} pets in: {pets_file.name}")


def update_sql_seed(sql_file: Path, placeholder_url: str = "/placeholder-product.svg"):
    """Update image_url values in SQL seed file."""

    with open(sql_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern to match image_url with external URLs in INSERT statements
    # Matches: image_url, 'https://...' or image_url = 'https://...'
    patterns = [
        # For VALUES: ... image_url, target_species ... VALUES (... 'https://...', ARRAY...
        (r"'https?://[^']+(?:\.png|\.jpg|\.jpeg|\.svg|\.gif|fit=crop[^']*)'", f"'{placeholder_url}'"),
        # More general URL pattern for image fields
        (r"(image_url,\s*[^)]+\([\s\S]*?)'https?://[^']*'", rf"\1'{placeholder_url}'"),
    ]

    # Count replacements
    original_len = len(content)

    # Replace external image URLs with placeholder
    # Match pattern: 'https://...' where it looks like an image URL
    url_pattern = r"'(https?://(?:images\.unsplash\.com|assets\.ruralmakro\.org|assets\.petco\.com|www\.[a-z]+\.com|[a-z]+\.cloudinary\.com|m\.media-amazon\.com|cdn\.shopify\.com|http2\.mlstatic\.com|placehold\.co|d36tnp772eyphs\.cloudfront\.net)[^']*)'"

    count = len(re.findall(url_pattern, content))
    content = re.sub(url_pattern, f"'{placeholder_url}'", content)

    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Updated {count} image URLs in: {sql_file.name}")


if __name__ == '__main__':
    base_dir = Path(__file__).parent.parent / 'db' / 'seeds' / 'data'
    seeds_dir = Path(__file__).parent.parent / 'db' / 'seeds'

    print("=" * 50)
    print("Updating Product Images")
    print("=" * 50)

    products_dir = base_dir / '03-store' / 'products'
    updated = update_product_images(products_dir)
    print(f"\nUpdated {len(updated)} product files")

    print("\n" + "=" * 50)
    print("Updating Category Images")
    print("=" * 50)

    categories_file = base_dir / '03-store' / 'categories.json'
    if categories_file.exists():
        update_category_images(categories_file)

    print("\n" + "=" * 50)
    print("Updating Pet Photos")
    print("=" * 50)

    pets_file = base_dir / '02-global' / 'pets.json'
    if pets_file.exists():
        update_pet_photos(pets_file)

    print("\n" + "=" * 50)
    print("Updating Generated SQL Seed")
    print("=" * 50)

    sql_seed = seeds_dir / 'generated-seed.sql'
    if sql_seed.exists():
        update_sql_seed(sql_seed)

    print("\n" + "=" * 50)
    print("Done!")
    print("=" * 50)
