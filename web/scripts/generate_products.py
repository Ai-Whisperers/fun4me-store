import json
import random
import os

# Configuration
OUTPUT_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".content_data",
    "adris",
    "products.json",
)
TARGET_COUNT = 450

# Taxonomy Data
CATEGORIES = {
    "Alimentos": {
        "subtypes": ["Seco", "Húmedo", "Snacks", "Medicado", "Natural"],
        "brands": [
            "Royal Canin",
            "Pro Plan",
            "Eukanuba",
            "Hill's",
            "Pedigree",
            "Whiskas",
            "Old Prince",
            "Vital Can",
            "Excellent",
        ],
        "animals": ["Perro", "Gato"],
        "ages": ["Cachorro", "Adulto", "Senior"],
        "images": [
            "https://www.royalcanin.com/es-ar/dogs/products/retail-products/medium-puppy-dry/-/media/1c5d0e7d5d0e40199e5a1b3b3b4b5b6b.jpg",
            "https://d36tnp772eyphs.cloudfront.net/winter-glampers/images/pro-plan-dog.jpg",
            "https://http2.mlstatic.com/D_NQ_NP_794274-MLA45648586820_042021-O.webp",
        ],
    },
    "Farmacia": {
        "subtypes": [
            "Antipulgas",
            "Desparasitante",
            "Suplemento",
            "Antibiótico",
            "Dermatología",
            "Ojos y Oídos",
        ],
        "brands": [
            "NexGard",
            "Bravecto",
            "Seresto",
            "Frontline",
            "Advantage",
            "Total Full",
            "Apto-Flex",
            "Drontal",
            "Simparica",
        ],
        "images": [
            "https://www.nexgard.com.ar/sites/default/files/styles/product_image/public/2021-03/NexGard-Spectra-Pack-Shot-Small.png?itok=2G4y6l5P",
            "https://cdn.shopify.com/s/files/1/0572/3560/3642/products/Seresto-Dog-Small_1024x1024.jpg?v=1626880000",
            "https://http2.mlstatic.com/D_NQ_NP_663309-MLA48636952775_122021-O.webp",
        ],
    },
    "Accesorios": {
        "subtypes": [
            "Collar",
            "Correa",
            "Pretal",
            "Cama",
            "Comedero",
            "Bebedero",
            "Transportadora",
            "Ropa",
        ],
        "brands": ["Zee.Dog", "Kong", "Mpets", "Ruffwear", "Generico"],
        "images": [
            "https://http2.mlstatic.com/D_NQ_NP_937667-MLA51368297637_092022-O.webp",
            "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop",
            "https://m.media-amazon.com/images/I/71Y8Jj+jvnL._AC_SX425_.jpg",
        ],
    },
    "Higiene": {
        "subtypes": [
            "Shampoo",
            "Acondicionador",
            "Colonia",
            "Peine",
            "Corta Uñas",
            "Piedras Sanitarias",
            "Paños Húmedos",
        ],
        "brands": ["Osspret", "Furminator", "Sanicat", "Baviera", "Trixie"],
        "images": [
            "https://http2.mlstatic.com/D_NQ_NP_608670-MLA44527376742_012021-O.webp",
            "https://m.media-amazon.com/images/I/61+U6Xq+XwL._AC_SY355_.jpg",
        ],
    },
    "Juguetes": {
        "subtypes": ["Pelota", "Peluche", "Interactivo", "Mordillo", "Caña", "Soga"],
        "brands": ["Kong", "Chuckit!", "Nerf Dog", "Trixie", "JW"],
        "images": [
            "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop",
            "https://m.media-amazon.com/images/I/71kXc-wFjBL._AC_SL1500_.jpg",
        ],
    },
}


def generate_products():
    products = []

    # Generate balanced distribution
    distribution = {
        "Alimentos": 120,
        "Farmacia": 100,
        "Accesorios": 80,
        "Higiene": 60,
        "Juguetes": 90,
    }

    count = 1

    for category, limit in distribution.items():
        data = CATEGORIES[category]
        for _ in range(limit):
            brand = random.choice(data.get("brands", ["Genérico"]))
            subtype = random.choice(data["subtypes"])

            # Name construction
            name = f"{subtype} {brand}"

            description_parts = [f"{subtype} de la marca {brand}."]

            if category == "Alimentos":
                animal = random.choice(data["animals"])
                age = random.choice(data["ages"])
                weight = random.choice([1, 3, 7.5, 15, 20])
                name += f" {animal} {age} {weight}kg"
                description_parts.append(
                    f"Alimento balanceado completo para {animal}s en etapa {age}."
                )
                price_base = 25000 + (weight * 4000)
            elif category == "Farmacia":
                name += f" x{random.choice([1, 3, 6])} unid."
                description_parts.append(
                    "Producto farmacéutico veterinario de venta libre."
                )
                price_base = 40000
            elif category == "Accesorios":
                color = random.choice(
                    ["Rojo", "Azul", "Negro", "Rosa", "Verde", "Camuflado"]
                )
                name += f" {color} Talle {random.choice(['S', 'M', 'L', 'XL'])}"
                description_parts.append(f"Accesorio de alta calidad, color {color}.")
                price_base = 15000
            else:
                price_base = 10000

            # Randomize price slightly
            price = int(price_base * random.uniform(0.8, 1.5) / 100) * 100

            product = {
                "id": f"prod_{count:04d}",
                "name": name,
                "category": category,
                "price": price,
                "image": random.choice(data["images"]),
                "description": " ".join(description_parts)
                + " Excelente calidad garantizada.",
            }
            products.append(product)
            count += 1

    # Shuffle to make it look natural in the grid
    random.shuffle(products)

    # Ensure directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=4, ensure_ascii=False)

    print(f"Generated {len(products)} products in {OUTPUT_FILE}")


if __name__ == "__main__":
    generate_products()
