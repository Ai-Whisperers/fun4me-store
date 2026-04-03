-- =============================================================================
-- Fun4Me Store - Seed Data
-- Paraguayan Adult Store / Sex Shop
-- All prices in Guaranies (PYG)
-- =============================================================================

-- =============================================================================
-- CATEGORIES (8 main categories)
-- =============================================================================
INSERT INTO categories (id, name, slug, description, image_url, sort_order, is_active) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Vibradores', 'vibradores', 'Vibradores de todo tipo: bullet, rabbit, wand y más. Encontrá el placer perfecto.', '/images/categories/vibradores.webp', 1, true),
  ('a1000000-0000-0000-0000-000000000002', 'Consoladores', 'consoladores', 'Consoladores realistas y de fantasía en diversos tamaños y materiales.', '/images/categories/consoladores.webp', 2, true),
  ('a1000000-0000-0000-0000-000000000003', 'Anal', 'anal', 'Plugs anales, beads y accesorios para la exploración anal segura.', '/images/categories/anal.webp', 3, true),
  ('a1000000-0000-0000-0000-000000000004', 'Para Él', 'para-el', 'Masturbadores, anillos, extensores y juguetes diseñados para el placer masculino.', '/images/categories/para-el.webp', 4, true),
  ('a1000000-0000-0000-0000-000000000005', 'Para Parejas', 'para-parejas', 'Juguetes y accesorios para disfrutar en pareja y explorar juntos.', '/images/categories/para-parejas.webp', 5, true),
  ('a1000000-0000-0000-0000-000000000006', 'Lencería', 'lenceria', 'Lencería sensual, conjuntos, bodys y disfraces para toda ocasión.', '/images/categories/lenceria.webp', 6, true),
  ('a1000000-0000-0000-0000-000000000007', 'Lubricantes', 'lubricantes', 'Lubricantes a base de agua, silicona y naturales. Geles de masaje.', '/images/categories/lubricantes.webp', 7, true),
  ('a1000000-0000-0000-0000-000000000008', 'Bienestar Sexual', 'bienestar-sexual', 'Productos de higiene íntima, ejercitadores de Kegel y salud sexual.', '/images/categories/bienestar-sexual.webp', 8, true);

-- =============================================================================
-- KINK CATEGORIES (6)
-- =============================================================================
INSERT INTO kink_categories (id, name, slug, description, image_url, sort_order) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Bondage', 'bondage', 'Cuerdas, esposas, cintas y restricciones para juegos de atadura.', '/images/kinks/bondage.webp', 1),
  ('b1000000-0000-0000-0000-000000000002', 'Impacto', 'impacto', 'Paletas, fustas, látigos y accesorios de impacto consensuado.', '/images/kinks/impacto.webp', 2),
  ('b1000000-0000-0000-0000-000000000003', 'Dominación & Sumisión', 'dominacion-sumision', 'Collares, correas y accesorios para dinámicas D/s.', '/images/kinks/ds.webp', 3),
  ('b1000000-0000-0000-0000-000000000004', 'Sensaciones', 'sensaciones', 'Plumas, velas de masaje, ruedas de Wartenberg y estimulación sensorial.', '/images/kinks/sensaciones.webp', 4),
  ('b1000000-0000-0000-0000-000000000005', 'Privación Sensorial', 'privacion-sensorial', 'Antifaces, vendas, tapones y mordazas para juegos sensoriales.', '/images/kinks/privacion.webp', 5),
  ('b1000000-0000-0000-0000-000000000006', 'Juego de Roles', 'juego-de-roles', 'Disfraces, accesorios temáticos y escenarios de fantasía.', '/images/kinks/roleplay.webp', 6);

-- =============================================================================
-- SHIPPING ZONES (3)
-- =============================================================================
INSERT INTO shipping_zones (id, name, neighborhoods, price, free_above, est_days, is_active, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Asunción', 
   ARRAY['Centro', 'Villa Morra', 'Carmelitas', 'Manorá', 'Las Mercedes', 'Sajonia', 'Recoleta', 'Jara', 'San Roque', 'Herrera', 'Loma Pytá', 'Zeballos Cué', 'Trinidad', 'Barrio Obrero', 'Ytay', 'San Pablo', 'Roberto L. Pettit', 'Tacumbú', 'Pinozá'],
   20000, 300000, '1-2 días hábiles', true, 1),
  ('c1000000-0000-0000-0000-000000000002', 'Gran Asunción',
   ARRAY['San Lorenzo', 'Fernando de la Mora', 'Lambaré', 'Luque', 'Mariano Roque Alonso', 'Capiatá', 'Limpio', 'Ñemby', 'San Antonio', 'Villa Elisa', 'Areguá'],
   35000, 400000, '2-3 días hábiles', true, 2),
  ('c1000000-0000-0000-0000-000000000003', 'Interior del País',
   ARRAY['Ciudad del Este', 'Encarnación', 'Pedro Juan Caballero', 'Concepción', 'Villarrica', 'Caaguazú', 'Coronel Oviedo', 'Pilar', 'Paraguarí', 'Salto del Guairá'],
   60000, NULL, '3-7 días hábiles', true, 3);

-- =============================================================================
-- PRODUCTS (50+ items)
-- =============================================================================

-- ---- VIBRADORES (10 products) ----
INSERT INTO products (id, name, slug, description, price, compare_at_price, category_id, brand, sku, images, tags, experience_level, material, is_active, is_featured, stock_quantity, meta_title, meta_description) VALUES

('d1000000-0000-0000-0000-000000000001', 'Vibrador Bullet Clásico Rosa', 'vibrador-bullet-clasico-rosa',
 'Vibrador bullet discreto y potente con 10 modos de vibración. Perfecto para principiantes. Resistente al agua, recargable por USB. Silencioso para uso discreto.',
 89000, 120000, 'a1000000-0000-0000-0000-000000000001', 'Fun4Me Basics', 'VIB-001',
 ARRAY['/images/products/bullet-rosa-1.webp', '/images/products/bullet-rosa-2.webp'],
 ARRAY['vibrador', 'bullet', 'principiante', 'discreto', 'recargable'],
 'beginner', 'Silicona médica ABS', true, true, 45,
 'Vibrador Bullet Rosa - Fun4Me Store', 'Vibrador bullet discreto con 10 modos de vibración. Perfecto para principiantes.'),

('d1000000-0000-0000-0000-000000000002', 'Vibrador Rabbit Doble Estimulación', 'vibrador-rabbit-doble-estimulacion',
 'El clásico vibrador rabbit con estimulación dual: vaginal y clitoral simultánea. 7 patrones de vibración, brazo flexible, silicona suave hipoalergénica.',
 285000, 350000, 'a1000000-0000-0000-0000-000000000001', 'Lelo', 'VIB-002',
 ARRAY['/images/products/rabbit-morado-1.webp', '/images/products/rabbit-morado-2.webp'],
 ARRAY['vibrador', 'rabbit', 'doble estimulación', 'clitoral', 'vaginal'],
 'intermediate', 'Silicona médica', true, true, 30,
 'Vibrador Rabbit Doble Estimulación - Fun4Me', 'Vibrador rabbit con estimulación dual vaginal y clitoral. 7 patrones de vibración.'),

('d1000000-0000-0000-0000-000000000003', 'Succionador de Clítoris Onda de Aire', 'succionador-clitoris-onda-aire',
 'Estimulador de clítoris por ondas de aire con tecnología de succión sin contacto. 11 niveles de intensidad. Orgasmos rápidos e intensos garantizados.',
 345000, NULL, 'a1000000-0000-0000-0000-000000000001', 'Satisfyer', 'VIB-003',
 ARRAY['/images/products/succionador-rosa-1.webp'],
 ARRAY['succionador', 'clítoris', 'ondas de aire', 'satisfyer'],
 'beginner', 'Silicona + ABS', true, true, 55,
 'Succionador de Clítoris por Ondas de Aire', 'Estimulador clitoral por ondas de aire. 11 niveles de intensidad.'),

('d1000000-0000-0000-0000-000000000004', 'Vibrador Wand Masajeador Potente', 'vibrador-wand-masajeador-potente',
 'Masajeador wand de alta potencia con cabeza flexible. Ideal para masajes corporales y estimulación intensa. 20 patrones, motor ultra potente.',
 195000, 250000, 'a1000000-0000-0000-0000-000000000001', 'Fun4Me Premium', 'VIB-004',
 ARRAY['/images/products/wand-negro-1.webp', '/images/products/wand-negro-2.webp'],
 ARRAY['wand', 'masajeador', 'potente', 'recargable'],
 'intermediate', 'Silicona + ABS', true, false, 35,
 'Vibrador Wand Masajeador Potente', 'Masajeador wand de alta potencia. 20 patrones de vibración.'),

('d1000000-0000-0000-0000-000000000005', 'Mini Vibrador de Dedo', 'mini-vibrador-dedo',
 'Vibrador de dedo compacto para estimulación precisa del clítoris durante el sexo. Textura suave, resistente al agua, batería de larga duración.',
 65000, NULL, 'a1000000-0000-0000-0000-000000000001', 'Fun4Me Basics', 'VIB-005',
 ARRAY['/images/products/dedo-lila-1.webp'],
 ARRAY['vibrador', 'dedo', 'compacto', 'parejas'],
 'beginner', 'Silicona', true, false, 60,
 'Mini Vibrador de Dedo', 'Vibrador de dedo compacto para estimulación clitoral precisa.'),

('d1000000-0000-0000-0000-000000000006', 'Vibrador Punto G Curvado Premium', 'vibrador-punto-g-curvado-premium',
 'Diseño ergonómico curvado para alcanzar el punto G con precisión. Motor dual, 10 velocidades, memoria de último patrón usado.',
 420000, 520000, 'a1000000-0000-0000-0000-000000000001', 'Lelo', 'VIB-006',
 ARRAY['/images/products/punto-g-bordo-1.webp', '/images/products/punto-g-bordo-2.webp'],
 ARRAY['punto G', 'premium', 'curvado', 'lelo'],
 'intermediate', 'Silicona médica', true, true, 20,
 'Vibrador Punto G Curvado Premium', 'Vibrador curvado premium para estimulación precisa del punto G.'),

('d1000000-0000-0000-0000-000000000007', 'Huevo Vibrador Control Remoto', 'huevo-vibrador-control-remoto',
 'Huevo vibrador con control remoto inalámbrico. Perfecto para juegos en pareja en público. 12 modos, alcance de 10 metros, ultra silencioso.',
 175000, NULL, 'a1000000-0000-0000-0000-000000000001', 'Lovense', 'VIB-007',
 ARRAY['/images/products/huevo-rosa-1.webp'],
 ARRAY['huevo', 'control remoto', 'parejas', 'discreto', 'público'],
 'intermediate', 'Silicona médica', true, false, 40,
 'Huevo Vibrador con Control Remoto', 'Huevo vibrador inalámbrico para juegos en pareja.'),

('d1000000-0000-0000-0000-000000000008', 'Vibrador de Lujo Sonique', 'vibrador-lujo-sonique',
 'Vibrador de gama alta con tecnología sónica. Estimulación profunda sin vibración superficial. 8 patrones sónicos, carga magnética, estuche de viaje incluido.',
 890000, 1100000, 'a1000000-0000-0000-0000-000000000001', 'Lelo', 'VIB-008',
 ARRAY['/images/products/sonique-dorado-1.webp', '/images/products/sonique-dorado-2.webp'],
 ARRAY['lujo', 'sónico', 'premium', 'regalo'],
 'advanced', 'Silicona médica + metal', true, true, 10,
 'Vibrador de Lujo Sonique', 'Vibrador de gama alta con tecnología sónica.'),

('d1000000-0000-0000-0000-000000000009', 'Vibrador Varita Mágica Compact', 'vibrador-varita-magica-compact',
 'Versión compacta del clásico wand. Cabe en tu cartera, potencia de sobra. 5 velocidades, cabeza de silicona suave.',
 125000, NULL, 'a1000000-0000-0000-0000-000000000001', 'Fun4Me Basics', 'VIB-009',
 ARRAY['/images/products/mini-wand-blanco-1.webp'],
 ARRAY['wand', 'compacto', 'viaje', 'discreto'],
 'beginner', 'Silicona + ABS', true, false, 50,
 'Vibrador Varita Mágica Compact', 'Mini wand vibrador compacto y potente.'),

('d1000000-0000-0000-0000-000000000010', 'Vibrador App Conectado Bluetooth', 'vibrador-app-conectado-bluetooth',
 'Vibrador inteligente controlado por app. Ideal para parejas a distancia. Crea patrones personalizados, sincroniza con música. Compatible iOS y Android.',
 520000, NULL, 'a1000000-0000-0000-0000-000000000001', 'Lovense', 'VIB-010',
 ARRAY['/images/products/app-vibrador-1.webp', '/images/products/app-vibrador-2.webp'],
 ARRAY['app', 'bluetooth', 'larga distancia', 'inteligente', 'parejas'],
 'intermediate', 'Silicona médica', true, true, 25,
 'Vibrador con App Bluetooth', 'Vibrador inteligente controlado por app para parejas a distancia.'),

-- ---- CONSOLADORES (7 products) ----

('d1000000-0000-0000-0000-000000000011', 'Consolador Realista 18cm Natural', 'consolador-realista-18cm-natural',
 'Consolador realista con textura de venas y ventosa de succión. 18cm insertables. Base plana compatible con arnés.',
 145000, NULL, 'a1000000-0000-0000-0000-000000000002', 'Fun4Me Basics', 'CON-001',
 ARRAY['/images/products/realista-natural-1.webp'],
 ARRAY['realista', 'ventosa', 'arnés compatible', '18cm'],
 'intermediate', 'Silicona dual density', true, false, 40,
 'Consolador Realista 18cm', 'Consolador realista de 18cm con ventosa y compatible con arnés.'),

('d1000000-0000-0000-0000-000000000012', 'Consolador de Cristal Espiral', 'consolador-cristal-espiral',
 'Consolador artesanal de vidrio borosilicato con diseño espiral. Estimulación única con texturas. Se puede usar frío o caliente.',
 235000, 290000, 'a1000000-0000-0000-0000-000000000002', 'Crystal Delights', 'CON-002',
 ARRAY['/images/products/cristal-espiral-1.webp', '/images/products/cristal-espiral-2.webp'],
 ARRAY['cristal', 'vidrio', 'artesanal', 'temperatura'],
 'intermediate', 'Vidrio borosilicato', true, true, 15,
 'Consolador de Cristal Espiral', 'Consolador artesanal de vidrio con diseño espiral.'),

('d1000000-0000-0000-0000-000000000013', 'Dildo de Fantasía Unicornio', 'dildo-fantasia-unicornio',
 'Dildo de fantasía con forma única de cuerno de unicornio. Colores arcoíris, textura estriada, base de succión. Edición limitada.',
 310000, NULL, 'a1000000-0000-0000-0000-000000000002', 'Mythical Toys', 'CON-003',
 ARRAY['/images/products/unicornio-1.webp', '/images/products/unicornio-2.webp'],
 ARRAY['fantasía', 'unicornio', 'colores', 'edición limitada'],
 'advanced', 'Silicona platino', true, false, 12,
 'Dildo de Fantasía Unicornio', 'Dildo de fantasía con diseño de unicornio en colores arcoíris.'),

('d1000000-0000-0000-0000-000000000014', 'Consolador Doble Penetración', 'consolador-doble-penetracion',
 'Consolador en U para doble penetración simultánea (vaginal + anal). Flexible, hipoalergénico, compatible con lubricantes a base de agua.',
 198000, NULL, 'a1000000-0000-0000-0000-000000000002', 'Fun4Me Premium', 'CON-004',
 ARRAY['/images/products/doble-morado-1.webp'],
 ARRAY['doble penetración', 'flexible', 'parejas'],
 'advanced', 'Silicona médica', true, false, 25,
 'Consolador Doble Penetración', 'Consolador para doble penetración simultánea.'),

('d1000000-0000-0000-0000-000000000015', 'Consolador Pequeño Principiante', 'consolador-pequeno-principiante',
 'Consolador slim de 14cm ideal para principiantes. Superficie ultra suave, punta redondeada, base de succión. Tu primera experiencia perfecta.',
 85000, NULL, 'a1000000-0000-0000-0000-000000000002', 'Fun4Me Basics', 'CON-005',
 ARRAY['/images/products/slim-rosa-1.webp'],
 ARRAY['principiante', 'slim', 'pequeño', 'suave'],
 'beginner', 'Silicona', true, false, 55,
 'Consolador Pequeño para Principiantes', 'Consolador slim ideal para primera experiencia.'),

('d1000000-0000-0000-0000-000000000016', 'Strap-On con Arnés Ajustable', 'strap-on-arnes-ajustable',
 'Kit completo de strap-on con arnés ajustable de nylon y consolador de silicona de 16cm. Ajusta a tallas S-XL. Anillo intercambiable.',
 275000, 340000, 'a1000000-0000-0000-0000-000000000002', 'Fun4Me Premium', 'CON-006',
 ARRAY['/images/products/strap-on-negro-1.webp', '/images/products/strap-on-negro-2.webp'],
 ARRAY['strap-on', 'arnés', 'parejas', 'pegging'],
 'intermediate', 'Nylon + Silicona', true, true, 20,
 'Strap-On con Arnés Ajustable', 'Kit de strap-on con arnés y consolador de silicona.'),

('d1000000-0000-0000-0000-000000000017', 'Consolador Realista Vibrador 20cm', 'consolador-realista-vibrador-20cm',
 'Consolador realista con vibración integrada, 20cm. 10 modos de vibración, control en la base, ventosa extra fuerte. Lo mejor de dos mundos.',
 265000, NULL, 'a1000000-0000-0000-0000-000000000002', 'Fun4Me Premium', 'CON-007',
 ARRAY['/images/products/realista-vib-1.webp'],
 ARRAY['realista', 'vibrador', 'ventosa', '20cm', 'potente'],
 'intermediate', 'Silicona dual density', true, false, 30,
 'Consolador Realista con Vibración 20cm', 'Consolador realista de 20cm con 10 modos de vibración.'),

-- ---- ANAL (6 products) ----

('d1000000-0000-0000-0000-000000000018', 'Kit Plugs Anales x3 Principiante', 'kit-plugs-anales-principiante',
 'Set de 3 plugs anales de tamaño progresivo (S, M, L). Base de seguridad, silicona ultra suave. Incluye bolsa de almacenamiento.',
 125000, 160000, 'a1000000-0000-0000-0000-000000000003', 'Fun4Me Basics', 'ANL-001',
 ARRAY['/images/products/kit-plugs-1.webp', '/images/products/kit-plugs-2.webp'],
 ARRAY['plugs', 'kit', 'principiante', 'progresivo', 'set'],
 'beginner', 'Silicona médica', true, true, 45,
 'Kit de 3 Plugs Anales para Principiantes', 'Set progresivo de 3 plugs anales de silicona.'),

('d1000000-0000-0000-0000-000000000019', 'Plug Anal Joya Cristal', 'plug-anal-joya-cristal',
 'Plug anal de acero inoxidable con piedra decorativa tipo cristal. Elegante y estimulante. Disponible para uso con temperatura.',
 95000, NULL, 'a1000000-0000-0000-0000-000000000003', 'Fun4Me Premium', 'ANL-002',
 ARRAY['/images/products/plug-joya-1.webp'],
 ARRAY['plug', 'joya', 'metal', 'elegante', 'temperatura'],
 'intermediate', 'Acero inoxidable', true, true, 60,
 'Plug Anal Joya de Cristal', 'Plug anal de acero con piedra decorativa.'),

('d1000000-0000-0000-0000-000000000020', 'Beads Anales Flexibles', 'beads-anales-flexibles',
 'Cadena de bolitas anales de 5 esferas progresivas. Aro de extracción seguro, silicona flexible y suave. Ideal para principiantes.',
 78000, NULL, 'a1000000-0000-0000-0000-000000000003', 'Fun4Me Basics', 'ANL-003',
 ARRAY['/images/products/beads-negro-1.webp'],
 ARRAY['beads', 'bolitas', 'progresivo', 'principiante'],
 'beginner', 'Silicona', true, false, 50,
 'Beads Anales Flexibles', 'Bolitas anales progresivas de silicona suave.'),

('d1000000-0000-0000-0000-000000000021', 'Vibrador Anal Prostático', 'vibrador-anal-prostatico',
 'Estimulador de próstata con forma anatómica curvada. 10 modos de vibración, motor silencioso. Control remoto inalámbrico incluido.',
 245000, 310000, 'a1000000-0000-0000-0000-000000000003', 'Lelo', 'ANL-004',
 ARRAY['/images/products/prostatico-negro-1.webp', '/images/products/prostatico-negro-2.webp'],
 ARRAY['próstata', 'vibrador', 'control remoto', 'masculino'],
 'intermediate', 'Silicona médica', true, true, 25,
 'Vibrador Anal Prostático con Control Remoto', 'Estimulador de próstata con 10 modos y control remoto.'),

('d1000000-0000-0000-0000-000000000022', 'Plug Anal Vibrador Cola de Zorro', 'plug-anal-cola-zorro',
 'Plug anal de silicona con cola de piel sintética de zorro. Perfecto para juego de roles y fantasías pet play. Cola de 40cm.',
 185000, NULL, 'a1000000-0000-0000-0000-000000000003', 'Fantasy Play', 'ANL-005',
 ARRAY['/images/products/cola-zorro-1.webp'],
 ARRAY['cola', 'zorro', 'pet play', 'roleplay', 'fantasía'],
 'intermediate', 'Silicona + piel sintética', true, false, 18,
 'Plug Anal Cola de Zorro', 'Plug anal con cola decorativa de zorro.'),

('d1000000-0000-0000-0000-000000000023', 'Ducha Anal Recargable', 'ducha-anal-recargable',
 'Kit de ducha anal con bulbo de silicona y 3 boquillas intercambiables. Esencial para la higiene y preparación. Fácil de limpiar.',
 65000, NULL, 'a1000000-0000-0000-0000-000000000003', 'Fun4Me Basics', 'ANL-006',
 ARRAY['/images/products/ducha-anal-1.webp'],
 ARRAY['ducha', 'higiene', 'preparación', 'limpieza'],
 'beginner', 'Silicona + ABS', true, false, 40,
 'Ducha Anal con Boquillas Intercambiables', 'Kit de ducha anal para higiene íntima.'),

-- ---- PARA ÉL (6 products) ----

('d1000000-0000-0000-0000-000000000024', 'Masturbador Manga Texturizada', 'masturbador-manga-texturizada',
 'Masturbador tipo manga con interior texturizado de múltiples canales. Material ultra realista, fácil de limpiar. Incluye lubricante de muestra.',
 155000, 195000, 'a1000000-0000-0000-0000-000000000004', 'Fleshlight', 'HIM-001',
 ARRAY['/images/products/manga-1.webp', '/images/products/manga-2.webp'],
 ARRAY['masturbador', 'manga', 'texturizado', 'realista'],
 'beginner', 'TPE ultra suave', true, true, 35,
 'Masturbador Manga Texturizada', 'Masturbador masculino con interior multi-canal.'),

('d1000000-0000-0000-0000-000000000025', 'Anillo Vibrador para Pene', 'anillo-vibrador-pene',
 'Anillo de silicona elástico con vibrador integrado. Estimula el clítoris durante la penetración. Recargable USB, 7 modos.',
 115000, NULL, 'a1000000-0000-0000-0000-000000000004', 'Fun4Me Premium', 'HIM-002',
 ARRAY['/images/products/anillo-vib-1.webp'],
 ARRAY['anillo', 'vibrador', 'parejas', 'erección', 'clitoral'],
 'beginner', 'Silicona médica', true, true, 50,
 'Anillo Vibrador para Pene', 'Anillo vibrador de silicona para mayor placer en pareja.'),

('d1000000-0000-0000-0000-000000000026', 'Bomba de Vacío Manual', 'bomba-vacio-manual',
 'Bomba de vacío para pene con manómetro de presión. Cilindro transparente, empuñadura ergonómica, válvula de liberación rápida.',
 175000, 220000, 'a1000000-0000-0000-0000-000000000004', 'Fun4Me Premium', 'HIM-003',
 ARRAY['/images/products/bomba-vacio-1.webp'],
 ARRAY['bomba', 'vacío', 'erección', 'tamaño'],
 'intermediate', 'ABS + Silicona', true, false, 20,
 'Bomba de Vacío Manual con Manómetro', 'Bomba de vacío para pene con control de presión.'),

('d1000000-0000-0000-0000-000000000027', 'Set Anillos de Pene x5', 'set-anillos-pene-x5',
 'Set de 5 anillos de diferentes tamaños y texturas para mantener la erección. Silicona elástica, cómodos para uso prolongado.',
 55000, NULL, 'a1000000-0000-0000-0000-000000000004', 'Fun4Me Basics', 'HIM-004',
 ARRAY['/images/products/set-anillos-1.webp'],
 ARRAY['anillos', 'set', 'erección', 'económico'],
 'beginner', 'Silicona', true, false, 70,
 'Set de 5 Anillos de Pene', 'Set de anillos de silicona para erección.'),

('d1000000-0000-0000-0000-000000000028', 'Masturbador Automático Giratorio', 'masturbador-automatico-giratorio',
 'Masturbador eléctrico con movimiento giratorio y de succión automático. 7 modos rotación + 7 modos succión. Recargable, fácil limpieza.',
 485000, 580000, 'a1000000-0000-0000-0000-000000000004', 'Tenga', 'HIM-005',
 ARRAY['/images/products/auto-masturbador-1.webp', '/images/products/auto-masturbador-2.webp'],
 ARRAY['masturbador', 'automático', 'giratorio', 'eléctrico', 'premium'],
 'intermediate', 'TPE + ABS', true, true, 15,
 'Masturbador Automático Giratorio', 'Masturbador eléctrico con rotación y succión automática.'),

('d1000000-0000-0000-0000-000000000029', 'Retardante Spray Masculino', 'retardante-spray-masculino',
 'Spray retardante de efecto prolongado con benzocaína al 5%. Aplicar 10 minutos antes. Sin adormecimiento excesivo. 30ml.',
 75000, NULL, 'a1000000-0000-0000-0000-000000000004', 'Fun4Me Basics', 'HIM-006',
 ARRAY['/images/products/retardante-1.webp'],
 ARRAY['retardante', 'spray', 'duración', 'masculino'],
 'beginner', NULL, true, false, 80,
 'Spray Retardante Masculino', 'Spray para prolongar el placer masculino.'),

-- ---- PARA PAREJAS (7 products) ----

('d1000000-0000-0000-0000-000000000030', 'Set de Dados Eróticos x3', 'set-dados-eroticos',
 'Set de 3 dados con acciones, partes del cuerpo y posiciones. Perfecto para romper la rutina y jugar en pareja. Incluye guía de juegos.',
 45000, NULL, 'a1000000-0000-0000-0000-000000000005', 'Fun4Me Basics', 'PAR-001',
 ARRAY['/images/products/dados-1.webp'],
 ARRAY['dados', 'juego', 'parejas', 'económico', 'diversión'],
 'beginner', 'Acrílico', true, false, 100,
 'Set de Dados Eróticos', 'Dados eróticos para juegos en pareja.'),

('d1000000-0000-0000-0000-000000000031', 'Kit Bondage Principiante 7 Piezas', 'kit-bondage-principiante',
 'Kit completo para iniciarse en el bondage: esposas acolchadas, venda para ojos, fusta suave, collar con correa, cuerda de seda, mordaza suave, pinzas suaves.',
 225000, 290000, 'a1000000-0000-0000-0000-000000000005', 'Fun4Me Premium', 'PAR-002',
 ARRAY['/images/products/kit-bondage-1.webp', '/images/products/kit-bondage-2.webp'],
 ARRAY['bondage', 'kit', 'principiante', 'BDSM', 'esposas'],
 'beginner', 'Cuero sintético + metal + seda', true, true, 30,
 'Kit Bondage Principiante 7 Piezas', 'Kit completo de bondage para principiantes.'),

('d1000000-0000-0000-0000-000000000032', 'Vibrador para Parejas We-Vibe', 'vibrador-parejas-we-vibe',
 'Vibrador en C para uso durante la penetración. Estimula clítoris y punto G simultáneamente. Control por app, 10+ modos.',
 650000, 790000, 'a1000000-0000-0000-0000-000000000005', 'We-Vibe', 'PAR-003',
 ARRAY['/images/products/we-vibe-1.webp', '/images/products/we-vibe-2.webp'],
 ARRAY['parejas', 'we-vibe', 'app', 'durante penetración', 'premium'],
 'intermediate', 'Silicona médica', true, true, 12,
 'Vibrador para Parejas We-Vibe', 'Vibrador en C para uso durante la penetración.'),

('d1000000-0000-0000-0000-000000000033', 'Set Velas de Masaje Erótico x4', 'set-velas-masaje-erotico',
 'Set de 4 velas de masaje con aromas sensuales: vainilla, canela, rosa y jazmín. Se derriten a baja temperatura como aceite de masaje.',
 95000, NULL, 'a1000000-0000-0000-0000-000000000005', 'Kama Sutra', 'PAR-004',
 ARRAY['/images/products/velas-masaje-1.webp'],
 ARRAY['velas', 'masaje', 'aromas', 'sensual', 'temperatura'],
 'beginner', 'Cera de soja natural', true, false, 45,
 'Set de Velas de Masaje Erótico', 'Velas aromáticas que se convierten en aceite de masaje.'),

('d1000000-0000-0000-0000-000000000034', 'Juego de Cartas 52 Posiciones', 'juego-cartas-52-posiciones',
 'Baraja de 52 cartas ilustradas con posiciones del Kama Sutra. Cada carta incluye instrucciones y nivel de dificultad.',
 55000, NULL, 'a1000000-0000-0000-0000-000000000005', 'Fun4Me Basics', 'PAR-005',
 ARRAY['/images/products/cartas-kama-1.webp'],
 ARRAY['cartas', 'kama sutra', 'posiciones', 'juego', 'diversión'],
 'beginner', 'Cartón plastificado', true, false, 65,
 'Juego de Cartas 52 Posiciones', 'Baraja ilustrada con posiciones del Kama Sutra.'),

('d1000000-0000-0000-0000-000000000035', 'Kit de Masaje Sensual Completo', 'kit-masaje-sensual-completo',
 'Kit premium con aceite de masaje caliente, pluma de avestruz, venda de seda, vela aromática y guía de masaje sensual ilustrada.',
 185000, 230000, 'a1000000-0000-0000-0000-000000000005', 'Kama Sutra', 'PAR-006',
 ARRAY['/images/products/kit-masaje-1.webp', '/images/products/kit-masaje-2.webp'],
 ARRAY['masaje', 'kit', 'sensual', 'aceite', 'regalo'],
 'beginner', 'Varios', true, true, 25,
 'Kit de Masaje Sensual Completo', 'Kit premium de masaje sensual para parejas.'),

('d1000000-0000-0000-0000-000000000036', 'Esposas Metálicas con Peluche', 'esposas-metalicas-peluche',
 'Esposas de metal con forro de peluche suave. Llave de seguridad incluida. Perfectas para juegos de rol y dominación suave.',
 65000, NULL, 'a1000000-0000-0000-0000-000000000005', 'Fun4Me Basics', 'PAR-007',
 ARRAY['/images/products/esposas-peluche-1.webp'],
 ARRAY['esposas', 'bondage', 'peluche', 'roleplay'],
 'beginner', 'Metal + peluche', true, false, 55,
 'Esposas Metálicas con Peluche', 'Esposas acolchadas para juegos de pareja.'),

-- ---- LENCERÍA (6 products) ----

('d1000000-0000-0000-0000-000000000037', 'Body de Encaje Negro Seductor', 'body-encaje-negro-seductor',
 'Body de encaje negro con transparencias estratégicas. Tirantes ajustables, cierre en la entrepierna. Tallas S-XL.',
 135000, 175000, 'a1000000-0000-0000-0000-000000000006', 'Fun4Me Lingerie', 'LEN-001',
 ARRAY['/images/products/body-negro-1.webp', '/images/products/body-negro-2.webp'],
 ARRAY['body', 'encaje', 'negro', 'lencería', 'seductor'],
 'beginner', 'Encaje + elastano', true, true, 30,
 'Body de Encaje Negro', 'Body seductor de encaje negro con transparencias.'),

('d1000000-0000-0000-0000-000000000038', 'Conjunto Lencería Rojo Pasión 3 Piezas', 'conjunto-lenceria-rojo-pasion',
 'Conjunto de 3 piezas: bralette push-up, tanga de encaje y portaligas. Color rojo intenso. Tallas S-L.',
 195000, 250000, 'a1000000-0000-0000-0000-000000000006', 'Fun4Me Lingerie', 'LEN-002',
 ARRAY['/images/products/conjunto-rojo-1.webp', '/images/products/conjunto-rojo-2.webp'],
 ARRAY['conjunto', 'rojo', '3 piezas', 'portaligas', 'push-up'],
 'beginner', 'Encaje + satén', true, true, 25,
 'Conjunto Lencería Rojo 3 Piezas', 'Conjunto de lencería rojo con bralette, tanga y portaligas.'),

('d1000000-0000-0000-0000-000000000039', 'Disfraz Enfermera Sexy', 'disfraz-enfermera-sexy',
 'Disfraz de enfermera con vestido corto, cofia, estetoscopio de juguete y medias de red. Talla única (S-L).',
 165000, NULL, 'a1000000-0000-0000-0000-000000000006', 'Fantasy Play', 'LEN-003',
 ARRAY['/images/products/enfermera-1.webp'],
 ARRAY['disfraz', 'enfermera', 'roleplay', 'sexy', 'fantasía'],
 'beginner', 'Poliéster + encaje', true, false, 20,
 'Disfraz Enfermera Sexy', 'Disfraz sexy de enfermera para juegos de roles.'),

('d1000000-0000-0000-0000-000000000040', 'Medias de Red Autoadhesivas', 'medias-red-autoadhesivas',
 'Medias de red clásicas con banda de silicona autoadhesiva. Se mantienen en su lugar sin portaligas. Negro. Talla única.',
 55000, NULL, 'a1000000-0000-0000-0000-000000000006', 'Fun4Me Lingerie', 'LEN-004',
 ARRAY['/images/products/medias-red-1.webp'],
 ARRAY['medias', 'red', 'autoadhesivas', 'clásico'],
 'beginner', 'Nylon + silicona', true, false, 60,
 'Medias de Red Autoadhesivas', 'Medias de red con banda autoadhesiva.'),

('d1000000-0000-0000-0000-000000000041', 'Babydoll Seda Rosa con Tanga', 'babydoll-seda-rosa-tanga',
 'Babydoll de seda sintética rosa con detalles de encaje. Incluye tanga a juego. Ligero y cómodo. Tallas S-XL.',
 115000, 145000, 'a1000000-0000-0000-0000-000000000006', 'Fun4Me Lingerie', 'LEN-005',
 ARRAY['/images/products/babydoll-rosa-1.webp'],
 ARRAY['babydoll', 'seda', 'rosa', 'tanga', 'cómodo'],
 'beginner', 'Seda sintética + encaje', true, false, 35,
 'Babydoll de Seda Rosa con Tanga', 'Babydoll de seda rosa con tanga incluida.'),

('d1000000-0000-0000-0000-000000000042', 'Arnés de Cuerpo Elástico', 'arnes-cuerpo-elastico',
 'Arnés corporal de tiras elásticas ajustables. Se usa sobre la ropa o directo en la piel. Look atrevido para noches especiales.',
 145000, NULL, 'a1000000-0000-0000-0000-000000000006', 'Fun4Me Lingerie', 'LEN-006',
 ARRAY['/images/products/arnes-cuerpo-1.webp', '/images/products/arnes-cuerpo-2.webp'],
 ARRAY['arnés', 'cuerpo', 'elástico', 'atrevido', 'BDSM'],
 'intermediate', 'Elástico + metal', true, false, 22,
 'Arnés de Cuerpo Elástico', 'Arnés corporal ajustable de tiras elásticas.'),

-- ---- LUBRICANTES (6 products) ----

('d1000000-0000-0000-0000-000000000043', 'Lubricante Base Agua 200ml', 'lubricante-base-agua-200ml',
 'Lubricante a base de agua de larga duración. Compatible con todos los juguetes y preservativos. Sin parabenos, sin fragancia. 200ml.',
 55000, NULL, 'a1000000-0000-0000-0000-000000000007', 'Fun4Me Basics', 'LUB-001',
 ARRAY['/images/products/lub-agua-1.webp'],
 ARRAY['lubricante', 'agua', 'compatible', 'básico', 'sin parabenos'],
 'beginner', NULL, true, false, 90,
 'Lubricante Base Agua 200ml', 'Lubricante a base de agua compatible con juguetes.'),

('d1000000-0000-0000-0000-000000000044', 'Lubricante Silicona Premium 100ml', 'lubricante-silicona-premium-100ml',
 'Lubricante de silicona de alta calidad. Ultra duradero, ideal para sexo anal y bajo el agua. No usar con juguetes de silicona. 100ml.',
 95000, NULL, 'a1000000-0000-0000-0000-000000000007', 'Überlube', 'LUB-002',
 ARRAY['/images/products/lub-silicona-1.webp'],
 ARRAY['lubricante', 'silicona', 'duradero', 'anal', 'premium'],
 'intermediate', NULL, true, true, 50,
 'Lubricante Silicona Premium 100ml', 'Lubricante de silicona ultra duradero.'),

('d1000000-0000-0000-0000-000000000045', 'Gel de Masaje Efecto Calor 150ml', 'gel-masaje-efecto-calor',
 'Gel lubricante con efecto calor para masajes sensuales. Comestible, sabor frutilla. A base de agua. 150ml.',
 75000, NULL, 'a1000000-0000-0000-0000-000000000007', 'Fun4Me Basics', 'LUB-003',
 ARRAY['/images/products/gel-calor-1.webp'],
 ARRAY['gel', 'masaje', 'calor', 'comestible', 'frutilla'],
 'beginner', NULL, true, false, 65,
 'Gel de Masaje Efecto Calor', 'Gel lubricante comestible con efecto calor.'),

('d1000000-0000-0000-0000-000000000046', 'Lubricante Anal Relajante 100ml', 'lubricante-anal-relajante',
 'Lubricante específico para sexo anal con extracto de aloe vera y efecto relajante suave. Extra espeso, larga duración. 100ml.',
 85000, NULL, 'a1000000-0000-0000-0000-000000000007', 'Fun4Me Premium', 'LUB-004',
 ARRAY['/images/products/lub-anal-1.webp'],
 ARRAY['lubricante', 'anal', 'relajante', 'aloe vera', 'espeso'],
 'beginner', NULL, true, true, 55,
 'Lubricante Anal Relajante 100ml', 'Lubricante anal con aloe vera y efecto relajante.'),

('d1000000-0000-0000-0000-000000000047', 'Aceite de Masaje Sensual Canela 250ml', 'aceite-masaje-sensual-canela',
 'Aceite de masaje con aroma a canela y efecto afrodisíaco. Textura sedosa, hidrata la piel. No mancha. 250ml.',
 85000, NULL, 'a1000000-0000-0000-0000-000000000007', 'Kama Sutra', 'LUB-005',
 ARRAY['/images/products/aceite-canela-1.webp'],
 ARRAY['aceite', 'masaje', 'canela', 'afrodisíaco', 'hidratante'],
 'beginner', NULL, true, false, 40,
 'Aceite de Masaje Sensual Canela 250ml', 'Aceite de masaje con aroma a canela.'),

('d1000000-0000-0000-0000-000000000048', 'Pack Lubricantes Sabores x4', 'pack-lubricantes-sabores',
 'Pack de 4 mini lubricantes comestibles: frutilla, chocolate, menta y cereza. 50ml cada uno. Ideales para sexo oral.',
 115000, 145000, 'a1000000-0000-0000-0000-000000000007', 'Fun4Me Basics', 'LUB-006',
 ARRAY['/images/products/pack-sabores-1.webp'],
 ARRAY['lubricante', 'sabores', 'pack', 'comestible', 'oral'],
 'beginner', NULL, true, false, 45,
 'Pack Lubricantes Sabores x4', 'Pack de lubricantes comestibles con 4 sabores.'),

-- ---- BIENESTAR SEXUAL (6 products) ----

('d1000000-0000-0000-0000-000000000049', 'Bolas Chinas Kegel Set Progresivo', 'bolas-chinas-kegel-progresivo',
 'Set de ejercitadores de Kegel con 4 pesos progresivos. Fortalece el suelo pélvico, mejora los orgasmos. Silicona médica, hilo de extracción.',
 145000, 185000, 'a1000000-0000-0000-0000-000000000008', 'Fun4Me Premium', 'BIE-001',
 ARRAY['/images/products/kegel-set-1.webp', '/images/products/kegel-set-2.webp'],
 ARRAY['kegel', 'bolas chinas', 'suelo pélvico', 'salud', 'ejercicio'],
 'beginner', 'Silicona médica', true, true, 35,
 'Bolas Chinas Kegel Set Progresivo', 'Set de ejercitadores Kegel con pesos progresivos.'),

('d1000000-0000-0000-0000-000000000050', 'Preservativos Ultra Finos x12', 'preservativos-ultra-finos-x12',
 'Preservativos ultra finos de látex natural. Máxima sensibilidad sin comprometer la seguridad. Lubricados. Caja de 12 unidades.',
 48000, NULL, 'a1000000-0000-0000-0000-000000000008', 'Prudence', 'BIE-002',
 ARRAY['/images/products/preservativos-1.webp'],
 ARRAY['preservativos', 'ultra finos', 'látex', 'protección'],
 'beginner', 'Látex natural', true, false, 120,
 'Preservativos Ultra Finos x12', 'Preservativos ultra finos para máxima sensibilidad.'),

('d1000000-0000-0000-0000-000000000051', 'Limpiador de Juguetes Antibacterial 150ml', 'limpiador-juguetes-antibacterial',
 'Spray limpiador antibacterial para juguetes íntimos. Sin alcohol, sin fragancia. Seca rápido, no deja residuos. 150ml.',
 45000, NULL, 'a1000000-0000-0000-0000-000000000008', 'Fun4Me Basics', 'BIE-003',
 ARRAY['/images/products/limpiador-1.webp'],
 ARRAY['limpiador', 'antibacterial', 'higiene', 'juguetes', 'spray'],
 'beginner', NULL, true, false, 75,
 'Limpiador de Juguetes Antibacterial', 'Spray limpiador antibacterial para juguetes íntimos.'),

('d1000000-0000-0000-0000-000000000052', 'Gel Estimulante Femenino Orgásmico', 'gel-estimulante-femenino-orgasmico',
 'Gel de aplicación tópica para el clítoris. Aumenta la sensibilidad y facilita el orgasmo. Con L-arginina y mentol. 30ml.',
 95000, NULL, 'a1000000-0000-0000-0000-000000000008', 'Fun4Me Premium', 'BIE-004',
 ARRAY['/images/products/gel-estimulante-1.webp'],
 ARRAY['estimulante', 'femenino', 'orgasmo', 'clítoris', 'gel'],
 'beginner', NULL, true, true, 40,
 'Gel Estimulante Femenino', 'Gel tópico para aumentar la sensibilidad clitoral.'),

('d1000000-0000-0000-0000-000000000053', 'Bolsa Almacenamiento Satinada Discreta', 'bolsa-almacenamiento-satinada',
 'Bolsa de satén con cordón para almacenar juguetes de forma higiénica y discreta. Disponible en 3 tamaños: S, M, L.',
 35000, NULL, 'a1000000-0000-0000-0000-000000000008', 'Fun4Me Basics', 'BIE-005',
 ARRAY['/images/products/bolsa-saten-1.webp'],
 ARRAY['almacenamiento', 'bolsa', 'discreto', 'satén', 'higiene'],
 'beginner', 'Satén', true, false, 80,
 'Bolsa de Almacenamiento Satinada', 'Bolsa de satén para guardar juguetes discretamente.'),

('d1000000-0000-0000-0000-000000000054', 'Kit Preservativos Variados x24', 'kit-preservativos-variados-x24',
 'Surtido de 24 preservativos: 6 ultra finos, 6 texturizados, 6 retardantes y 6 de sabores. Ideal para probar todos.',
 85000, 110000, 'a1000000-0000-0000-0000-000000000008', 'Prudence', 'BIE-006',
 ARRAY['/images/products/kit-preservativos-1.webp'],
 ARRAY['preservativos', 'variados', 'kit', 'surtido', 'protección'],
 'beginner', 'Látex natural', true, false, 60,
 'Kit Preservativos Variados x24', 'Surtido de 24 preservativos de 4 tipos diferentes.');

-- =============================================================================
-- PRODUCT KINKS (assign kink categories to relevant products)
-- =============================================================================
INSERT INTO product_kinks (product_id, kink_id) VALUES
  -- Kit Bondage Principiante -> Bondage, D&S, Privación Sensorial
  ('d1000000-0000-0000-0000-000000000031', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000031', 'b1000000-0000-0000-0000-000000000003'),
  ('d1000000-0000-0000-0000-000000000031', 'b1000000-0000-0000-0000-000000000005'),

  -- Esposas Metálicas con Peluche -> Bondage, D&S
  ('d1000000-0000-0000-0000-000000000036', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000036', 'b1000000-0000-0000-0000-000000000003'),

  -- Plug Anal Cola de Zorro -> Juego de Roles
  ('d1000000-0000-0000-0000-000000000022', 'b1000000-0000-0000-0000-000000000006'),

  -- Disfraz Enfermera Sexy -> Juego de Roles
  ('d1000000-0000-0000-0000-000000000039', 'b1000000-0000-0000-0000-000000000006'),

  -- Arnés de Cuerpo Elástico -> Bondage, D&S
  ('d1000000-0000-0000-0000-000000000042', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000042', 'b1000000-0000-0000-0000-000000000003'),

  -- Set Velas de Masaje Erótico -> Sensaciones
  ('d1000000-0000-0000-0000-000000000033', 'b1000000-0000-0000-0000-000000000004'),

  -- Kit de Masaje Sensual Completo -> Sensaciones
  ('d1000000-0000-0000-0000-000000000035', 'b1000000-0000-0000-0000-000000000004'),

  -- Huevo Vibrador Control Remoto -> D&S (partner control)
  ('d1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000003'),

  -- Vibrador App Conectado -> D&S (remote control power dynamic)
  ('d1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000003'),

  -- Plug Anal Joya -> D&S, Juego de Roles
  ('d1000000-0000-0000-0000-000000000019', 'b1000000-0000-0000-0000-000000000003'),
  ('d1000000-0000-0000-0000-000000000019', 'b1000000-0000-0000-0000-000000000006'),

  -- Strap-On -> D&S
  ('d1000000-0000-0000-0000-000000000016', 'b1000000-0000-0000-0000-000000000003'),

  -- Gel de Masaje Efecto Calor -> Sensaciones
  ('d1000000-0000-0000-0000-000000000045', 'b1000000-0000-0000-0000-000000000004'),

  -- Consolador de Cristal (temperature play) -> Sensaciones
  ('d1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000004');

-- =============================================================================
-- COUPONS
-- =============================================================================
INSERT INTO coupons (id, code, type, value, min_order, max_uses, uses_count, expires_at, is_active) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'BIENVENIDO', 'percentage', 10, 100000, NULL, 0, '2026-12-31T23:59:59Z', true),
  ('e1000000-0000-0000-0000-000000000002', 'ENVIOGRATIS', 'free_shipping', 0, 150000, 500, 0, '2026-06-30T23:59:59Z', true),
  ('e1000000-0000-0000-0000-000000000003', 'PRIMERA10', 'percentage', 10, 80000, 1000, 0, '2026-12-31T23:59:59Z', true),
  ('e1000000-0000-0000-0000-000000000004', 'VERANO25', 'percentage', 25, 200000, 200, 0, '2026-03-31T23:59:59Z', true),
  ('e1000000-0000-0000-0000-000000000005', 'DESCUENTO50K', 'fixed', 50000, 250000, 100, 0, '2026-12-31T23:59:59Z', true);

-- =============================================================================
-- SITE SETTINGS
-- =============================================================================
INSERT INTO site_settings (key, value) VALUES
  ('announcement_bar', '{"enabled": true, "message": "🔥 Envío GRATIS en Asunción para compras mayores a Gs 300.000 | Código: BIENVENIDO para 10% OFF", "bg_color": "#e91e63", "text_color": "#ffffff"}'::jsonb),
  ('store_info', '{"name": "Fun4Me Store", "tagline": "Tu tienda de placer en Paraguay", "phone": "+595 21 555 1234", "whatsapp": "+595 981 555 123", "email": "hola@fun4me.com.py", "address": "Asunción, Paraguay", "hours": "Lun-Sáb 10:00-20:00"}'::jsonb),
  ('shipping_config', '{"default_zone": "c1000000-0000-0000-0000-000000000001", "free_shipping_threshold_asuncion": 300000, "free_shipping_threshold_gran_asuncion": 400000, "discrete_packaging": true, "packaging_note": "Todos los envíos son en paquete discreto sin indicación del contenido"}'::jsonb),
  ('payment_config', '{"bank_accounts": [{"bank": "Banco Itaú", "account": "123-456789-001", "holder": "Fun4Me SRL", "ruc": "80123456-7"}, {"bank": "Banco Continental", "account": "987-654321-002", "holder": "Fun4Me SRL", "ruc": "80123456-7"}], "cod_enabled": true, "bancard_enabled": false, "bancard_merchant_id": null}'::jsonb),
  ('seo_config', '{"site_title": "Fun4Me Store | Tienda de Placer en Paraguay", "meta_description": "La mejor tienda de productos para adultos en Paraguay. Vibradores, lencería, lubricantes y más. Envío discreto a todo el país. 🔞", "og_image": "/images/og-image.webp"}'::jsonb),
  ('age_verification', '{"enabled": true, "min_age": 18, "message": "Debes ser mayor de 18 años para ingresar a este sitio", "cookie_days": 30}'::jsonb),
  ('social_links', '{"instagram": "https://instagram.com/fun4me.py", "tiktok": "https://tiktok.com/@fun4me.py", "twitter": null, "facebook": null}'::jsonb),
  ('currency', '{"code": "PYG", "symbol": "Gs", "name": "Guaraní paraguayo", "decimal_places": 0, "thousand_separator": ".", "format": "Gs {amount}"}'::jsonb);

-- =============================================================================
-- DONE - Seed data complete
-- 54 products, 8 categories, 6 kink categories, 3 shipping zones,
-- 5 coupons, 8 site settings, 17 product-kink assignments
-- =============================================================================
