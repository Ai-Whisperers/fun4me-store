/**
 * Comprehensive toxic foods database for various pet species
 *
 * Sources:
 * - ASPCA Animal Poison Control Center (aspca.org/pet-care/animal-poison-control)
 * - Pet Poison Helpline (petpoisonhelpline.com/poisons)
 * - Merck Veterinary Manual - Toxicology Section
 * - FDA Animal Health (fda.gov/animal-veterinary)
 * - Veterinary Toxicology: Basic and Clinical Principles (Gupta)
 *
 * Toxicity Levels:
 * - Alta (High): Can be fatal or cause severe organ damage
 * - Media (Medium): Can cause significant illness requiring treatment
 * - Baja (Low): May cause mild to moderate symptoms
 *
 * Treatment Urgency:
 * - Inmediata: Life-threatening, seek emergency care NOW
 * - Urgente: Serious, contact vet within 1-2 hours
 * - Pronto: Monitor and contact vet same day
 */

export type Species =
  | 'perro'
  | 'gato'
  | 'ave'
  | 'conejo'
  | 'tortuga'
  | 'hamster'
  | 'cobayo'
  | 'huron'
  | 'reptil'

export interface ToxicFoodItem {
  id: string
  name: string
  nameEn: string
  toxicity: 'Alta' | 'Media' | 'Baja'
  species: Species[]
  toxicComponent: string
  mechanismOfAction: string
  symptoms: string
  onsetTime: string
  treatmentUrgency: 'Inmediata' | 'Urgente' | 'Pronto'
  notes?: string
  lethalDose?: string
  category:
    | 'fruta'
    | 'verdura'
    | 'dulce'
    | 'bebida'
    | 'condimento'
    | 'lacteo'
    | 'carne'
    | 'nuez'
    | 'planta'
    | 'insecto'
    | 'otro'
  sources: string[]
}

export const TOXIC_FOODS: ToxicFoodItem[] = [
  // ============================================
  // ALTA TOXICIDAD - TODOS LOS ANIMALES
  // ============================================
  {
    id: 'chocolate',
    name: 'Chocolate',
    nameEn: 'Chocolate',
    toxicity: 'Alta',
    species: ['perro', 'gato', 'ave', 'conejo', 'hamster', 'cobayo', 'huron'],
    toxicComponent: 'Teobromina y cafeína (metilxantinas)',
    mechanismOfAction:
      'Las metilxantinas bloquean los receptores de adenosina, causando estimulación cardíaca y del sistema nervioso central. Inhiben la fosfodiesterasa, aumentando el AMP cíclico.',
    symptoms:
      'Vómitos, diarrea, jadeo excesivo, sed aumentada, hiperactividad, ritmo cardíaco anormal, temblores, convulsiones, muerte',
    onsetTime: '6-12 horas',
    treatmentUrgency: 'Inmediata',
    notes:
      'El chocolate negro contiene 130-450mg teobromina/oz. El chocolate con leche contiene 44-58mg/oz. El chocolate blanco tiene cantidades mínimas.',
    lethalDose:
      'Perros: 100-200mg teobromina/kg. Aves: extremadamente sensibles, dosis mucho menores son fatales.',
    category: 'dulce',
    sources: ['ASPCA', 'Pet Poison Helpline', 'Merck Veterinary Manual'],
  },
  {
    id: 'xilitol',
    name: 'Xilitol',
    nameEn: 'Xylitol',
    toxicity: 'Alta',
    species: ['perro', 'conejo', 'cobayo', 'huron'],
    toxicComponent: 'Xilitol (alcohol de azúcar)',
    mechanismOfAction:
      'Causa liberación masiva de insulina del páncreas, resultando en hipoglucemia severa. En dosis altas, causa necrosis hepática por mecanismo desconocido.',
    symptoms:
      'Vómitos (15-30 min), debilidad, pérdida de coordinación, colapso, convulsiones, ictericia (fallo hepático)',
    onsetTime: '15-30 minutos (hipoglucemia), 24-72 horas (fallo hepático)',
    treatmentUrgency: 'Inmediata',
    notes:
      'Presente en chicles sin azúcar, caramelos, pasta de dientes, mantequilla de maní, productos horneados "sin azúcar". Los hurones son extremadamente sensibles.',
    lethalDose:
      'Perros: >0.1g/kg causa hipoglucemia, >0.5g/kg causa fallo hepático. Un chicle puede contener 0.3-1.5g de xilitol.',
    category: 'dulce',
    sources: ['ASPCA', 'Pet Poison Helpline', 'Veterinary Toxicology (Gupta)'],
  },
  {
    id: 'uvas',
    name: 'Uvas y Pasas',
    nameEn: 'Grapes and Raisins',
    toxicity: 'Alta',
    species: ['perro', 'gato', 'huron'],
    toxicComponent: 'Ácido tartárico (identificado en 2021)',
    mechanismOfAction:
      'El ácido tartárico causa necrosis tubular renal aguda. La sensibilidad individual varía enormemente - algunos perros toleran grandes cantidades, otros mueren con pocas uvas.',
    symptoms:
      'Vómitos (2-6 horas), letargo, pérdida de apetito, dolor abdominal, oliguria/anuria, insuficiencia renal aguda',
    onsetTime: '2-6 horas (vómitos), 24-72 horas (fallo renal)',
    treatmentUrgency: 'Inmediata',
    notes:
      'Las pasas son 4-5x más concentradas que las uvas frescas. El jugo de uva y el vino también son tóxicos. No existe dosis segura conocida.',
    lethalDose: 'Variable - reportes de toxicidad con tan solo 4-5 uvas en perros pequeños',
    category: 'fruta',
    sources: ['ASPCA', 'JAVMA 2021 Study', 'Pet Poison Helpline'],
  },
  {
    id: 'aguacate',
    name: 'Aguacate (Palta)',
    nameEn: 'Avocado',
    toxicity: 'Alta',
    species: ['ave', 'conejo', 'cobayo', 'hamster'],
    toxicComponent: 'Persina (toxina fungicida derivada de ácido graso)',
    mechanismOfAction:
      'La persina causa daño al músculo cardíaco (miocardio) en aves, llevando a insuficiencia cardíaca congestiva. En mamíferos pequeños causa necrosis de glándulas mamarias y fallo cardíaco.',
    symptoms:
      'Aves: dificultad respiratoria, plumas erizadas, edema subcutáneo, muerte súbita. Mamíferos: mastitis necrótica, edema, fallo cardíaco.',
    onsetTime: '12-24 horas en aves (puede ser mortal en 24-48h)',
    treatmentUrgency: 'Inmediata',
    notes:
      'TODAS las partes son tóxicas: pulpa, hueso, cáscara, hojas, corteza. La variedad guatemalteca es la más tóxica. Perros y gatos generalmente solo tienen malestar GI leve.',
    category: 'fruta',
    sources: ['Merck Veterinary Manual', 'Pet Poison Helpline', 'Avian Medicine (Ritchie)'],
  },
  {
    id: 'cebolla',
    name: 'Cebolla',
    nameEn: 'Onion',
    toxicity: 'Alta',
    species: ['perro', 'gato', 'ave', 'conejo', 'cobayo', 'huron'],
    toxicComponent: 'N-propil disulfuro y otros organosulfóxidos',
    mechanismOfAction:
      'Los compuestos de azufre oxidan la hemoglobina, formando cuerpos de Heinz que dañan los glóbulos rojos. Esto causa hemólisis (destrucción de glóbulos rojos) y anemia.',
    symptoms:
      'Debilidad, letargo, encías pálidas o amarillas, orina oscura/rojiza (hemoglobinuria), vómitos, diarrea, taquicardia',
    onsetTime: '1-5 días para anemia clínica',
    treatmentUrgency: 'Urgente',
    notes:
      'Tóxico en TODAS sus formas: cruda, cocida, en polvo, deshidratada, en salsas. Los gatos son 2-3x más sensibles que los perros.',
    lethalDose: 'Perros: >15-30g/kg. Gatos: >5g/kg. Una cebolla mediana = 100g.',
    category: 'verdura',
    sources: ['ASPCA', 'Merck Veterinary Manual', 'JAVMA'],
  },
  {
    id: 'ajo',
    name: 'Ajo',
    nameEn: 'Garlic',
    toxicity: 'Alta',
    species: ['perro', 'gato', 'ave', 'conejo', 'hamster', 'cobayo', 'huron'],
    toxicComponent: 'Tiosulfato y alicina (5x más concentrado que la cebolla)',
    mechanismOfAction:
      'Mismo mecanismo que la cebolla pero más potente. La alicina se convierte en compuestos organosulfurados que oxidan la hemoglobina.',
    symptoms:
      'Debilidad, letargo, encías pálidas, ritmo cardíaco elevado, colapso, anemia hemolítica, olor a ajo en aliento',
    onsetTime: '1-5 días para anemia clínica',
    treatmentUrgency: 'Urgente',
    notes:
      '5x más tóxico que la cebolla por peso. El ajo en polvo es especialmente concentrado. Algunos productos para mascotas contienen ajo - evitar.',
    lethalDose: 'Perros: >15-30g/kg. Gatos: mucho más sensibles. Un diente de ajo = 3-7g.',
    category: 'condimento',
    sources: ['ASPCA', 'Pet Poison Helpline', 'Veterinary Toxicology (Gupta)'],
  },
  {
    id: 'alcohol',
    name: 'Alcohol',
    nameEn: 'Alcohol',
    toxicity: 'Alta',
    species: ['perro', 'gato', 'ave', 'conejo', 'tortuga', 'hamster', 'cobayo', 'huron', 'reptil'],
    toxicComponent: 'Etanol',
    mechanismOfAction:
      'El etanol es un depresor del SNC. Se metaboliza a acetaldehído (tóxico) y luego a acetato. Los animales pequeños tienen menos capacidad de metabolización.',
    symptoms:
      'Vómitos, diarrea, dificultad respiratoria, incoordinación, depresión del SNC, hipotermia, hipoglucemia, acidosis metabólica, coma, muerte',
    onsetTime: '15-30 minutos',
    treatmentUrgency: 'Inmediata',
    notes:
      'Incluye cerveza, vino, licores, y alimentos con alcohol (rum cake, tiramisú). La masa de pan cruda también produce etanol durante la fermentación.',
    lethalDose: 'Perros/Gatos: 5.5-7.9 ml/kg de etanol puro',
    category: 'bebida',
    sources: ['ASPCA', 'Merck Veterinary Manual', 'Pet Poison Helpline'],
  },
  {
    id: 'cafeina',
    name: 'Cafeína',
    nameEn: 'Caffeine',
    toxicity: 'Alta',
    species: ['perro', 'gato', 'ave', 'conejo', 'hamster', 'cobayo', 'huron'],
    toxicComponent: 'Cafeína (1,3,7-trimetilxantina)',
    mechanismOfAction:
      'Bloquea receptores de adenosina, aumenta liberación de catecolaminas. Causa estimulación cardíaca, vasoconstricción, y excitación del SNC. Las aves son extremadamente sensibles.',
    symptoms:
      'Hiperactividad, jadeo, vómitos, taquicardia, arritmias, hipertensión, temblores, convulsiones, hipertermia',
    onsetTime: '30 minutos - 2 horas',
    treatmentUrgency: 'Inmediata',
    notes:
      'Presente en café, té, bebidas energéticas, refrescos de cola, chocolate, medicamentos (No-Doz, Excedrin). Las aves pueden morir con dosis mínimas.',
    lethalDose: 'Perros: 140mg/kg. Aves: mucho menor. Una taza de café = ~100mg cafeína.',
    category: 'bebida',
    sources: ['ASPCA', 'Pet Poison Helpline', 'Avian Medicine (Ritchie)'],
  },
  {
    id: 'macadamia',
    name: 'Nueces de Macadamia',
    nameEn: 'Macadamia Nuts',
    toxicity: 'Alta',
    species: ['perro'],
    toxicComponent: 'Toxina desconocida',
    mechanismOfAction:
      'Mecanismo no completamente entendido. Se cree que afecta la función neuromuscular y posiblemente la regulación de temperatura.',
    symptoms:
      'Debilidad en patas traseras (ataxia), vómitos, temblores, hipertermia (hasta 40.5°C), incapacidad para caminar, dolor articular',
    onsetTime: '12 horas',
    treatmentUrgency: 'Urgente',
    notes:
      'Generalmente no fatal pero muy incómodo. Los síntomas suelen resolver en 24-48 horas con tratamiento de soporte. Chocolate + macadamia es especialmente peligroso.',
    lethalDose: 'Síntomas con tan solo 2.4g/kg de peso corporal (aprox. 1 nuez/kg)',
    category: 'nuez',
    sources: ['ASPCA', 'JAVMA', 'Pet Poison Helpline'],
  },

  // ============================================
  // ESPECÍFICO PARA AVES
  // ============================================
  {
    id: 'sal-aves',
    name: 'Sal (para aves)',
    nameEn: 'Salt (for birds)',
    toxicity: 'Alta',
    species: ['ave'],
    toxicComponent: 'Cloruro de sodio',
    mechanismOfAction:
      'Las aves tienen riñones menos eficientes para excretar sodio. El exceso causa deshidratación celular, edema cerebral, y fallo renal.',
    symptoms: 'Sed extrema, poliuria, debilidad, temblores, convulsiones, edema cerebral, muerte',
    onsetTime: '2-6 horas',
    treatmentUrgency: 'Inmediata',
    notes:
      'Snacks salados (papas fritas, pretzels, galletas saladas) son extremadamente peligrosos. El agua salada también es tóxica.',
    lethalDose: 'Aves: >4g/kg (mucho menor que mamíferos)',
    category: 'condimento',
    sources: ['Merck Veterinary Manual', 'Avian Medicine (Ritchie)', 'Pet Poison Helpline'],
  },
  {
    id: 'semillas-manzana',
    name: 'Semillas de Manzana/Frutas',
    nameEn: 'Apple/Fruit Seeds',
    toxicity: 'Alta',
    species: ['ave', 'perro', 'gato', 'conejo', 'hamster', 'cobayo'],
    toxicComponent: 'Amigdalina (glucósido cianogénico)',
    mechanismOfAction:
      'La amigdalina se convierte en cianuro de hidrógeno (HCN) en el tracto GI. El cianuro bloquea la citocromo c oxidasa, impidiendo la respiración celular.',
    symptoms:
      'Dificultad respiratoria, jadeo, pupilas dilatadas, encías rojo cereza brillante, convulsiones, shock, muerte',
    onsetTime: '15-60 minutos',
    treatmentUrgency: 'Inmediata',
    notes:
      'Aplica a semillas de: manzana, cereza, durazno, ciruela, albaricoque, pera. La pulpa de estas frutas es segura. Las aves son especialmente sensibles.',
    lethalDose: 'Aves: muy pocas semillas pueden ser fatales',
    category: 'fruta',
    sources: ['Merck Veterinary Manual', 'ASPCA', 'Veterinary Toxicology (Gupta)'],
  },

  // ============================================
  // ESPECÍFICO PARA REPTILES
  // ============================================
  {
    id: 'luciernagas',
    name: 'Luciérnagas',
    nameEn: 'Fireflies',
    toxicity: 'Alta',
    species: ['reptil', 'tortuga'],
    toxicComponent: 'Lucibufaginas (bufadienolidos)',
    mechanismOfAction:
      'Las lucibufaginas son glucósidos cardíacos similares a la digoxina. Inhiben la bomba Na+/K+-ATPasa del corazón, causando arritmias fatales.',
    symptoms:
      'Vómitos (si pueden), letargo extremo, cambio de color (oscurecimiento), arritmias, paro cardíaco súbito',
    onsetTime: 'Minutos a pocas horas',
    treatmentUrgency: 'Inmediata',
    notes:
      'UNA SOLA luciérnaga puede matar a un lagarto barbudo o gecko. También tóxicas para ranas y sapos. Mantener reptiles alejados de áreas donde hay luciérnagas.',
    lethalDose: '1 luciérnaga puede ser fatal para reptiles pequeños',
    category: 'insecto',
    sources: [
      'Merck Veterinary Manual',
      'Journal of Herpetological Medicine',
      'Exotic Animal Formulary (Carpenter)',
    ],
  },
  {
    id: 'espinaca-reptiles',
    name: 'Espinaca/Col Rizada (exceso)',
    nameEn: 'Spinach/Kale (excess)',
    toxicity: 'Media',
    species: ['reptil', 'tortuga', 'conejo', 'cobayo'],
    toxicComponent: 'Ácido oxálico (oxalatos)',
    mechanismOfAction:
      'Los oxalatos se unen al calcio dietario formando oxalato de calcio insoluble. Esto impide la absorción de calcio, causando Enfermedad Metabólica Ósea (MBD).',
    symptoms:
      'Debilidad, huesos blandos/deformados, fracturas patológicas, temblores, parálisis (reptiles), convulsiones',
    onsetTime: 'Crónico (semanas a meses de consumo excesivo)',
    treatmentUrgency: 'Pronto',
    notes:
      'Pequeñas cantidades ocasionales son seguras. El problema es alimentación frecuente. Otros vegetales altos en oxalatos: acelga, ruibarbo, remolacha.',
    category: 'verdura',
    sources: [
      'Merck Veterinary Manual',
      'Reptile Medicine and Surgery (Mader)',
      'Exotic Animal Formulary',
    ],
  },

  // ============================================
  // ESPECÍFICO PARA PEQUEÑOS MAMÍFEROS
  // ============================================
  {
    id: 'ruibarbo',
    name: 'Ruibarbo',
    nameEn: 'Rhubarb',
    toxicity: 'Alta',
    species: ['conejo', 'cobayo', 'hamster', 'perro', 'gato'],
    toxicComponent: 'Ácido oxálico (concentración muy alta en hojas)',
    mechanismOfAction:
      'Los oxalatos solubles causan hipocalcemia aguda y precipitan en los riñones como cristales de oxalato de calcio, causando nefrosis oxálica.',
    symptoms:
      'Babeo, vómitos, diarrea, letargo, temblores, debilidad muscular, fallo renal agudo, convulsiones',
    onsetTime: '2-6 horas',
    treatmentUrgency: 'Inmediata',
    notes:
      'Las HOJAS son mucho más tóxicas que los tallos. Nunca alimentar hojas de ruibarbo. Los tallos cocidos son menos peligrosos pero aún no recomendados.',
    lethalDose: 'Conejos: muy pequeñas cantidades de hojas pueden ser fatales',
    category: 'verdura',
    sources: ['Merck Veterinary Manual', 'Rabbit Medicine (Harcourt-Brown)', 'ASPCA'],
  },
  {
    id: 'frijoles-crudos',
    name: 'Frijoles/Judías Crudas',
    nameEn: 'Raw Beans',
    toxicity: 'Alta',
    species: ['conejo', 'cobayo', 'perro', 'gato', 'ave'],
    toxicComponent: 'Fitohemaglutinina (lectina)',
    mechanismOfAction:
      'La lectina se une a las células intestinales, causando aglutinación celular y daño a la mucosa. Esto resulta en malabsorción severa y posible perforación.',
    symptoms:
      'Vómitos severos, diarrea sanguinolenta, dolor abdominal intenso, estasis GI (conejos), deshidratación, shock',
    onsetTime: '1-3 horas',
    treatmentUrgency: 'Urgente',
    notes:
      'Los frijoles rojos crudos son los más peligrosos. La cocción completa destruye la lectina. Los frijoles enlatados/cocidos son seguros en moderación.',
    lethalDose: 'Pocas judías crudas pueden causar toxicidad severa',
    category: 'verdura',
    sources: ['Merck Veterinary Manual', 'FDA', 'Veterinary Toxicology (Gupta)'],
  },
  {
    id: 'lechuga-iceberg',
    name: 'Lechuga Iceberg',
    nameEn: 'Iceberg Lettuce',
    toxicity: 'Baja',
    species: ['conejo', 'cobayo', 'tortuga'],
    toxicComponent: 'Lactucarium (efecto sedante) + alto contenido de agua, bajo valor nutricional',
    mechanismOfAction:
      'El lactucarium tiene efecto sedante leve. El problema principal es dilución nutricional y diarrea por exceso de agua, llevando a estasis GI en conejos.',
    symptoms: 'Diarrea, deshidratación, estasis gastrointestinal (conejos), letargo, inapetencia',
    onsetTime: '12-24 horas',
    treatmentUrgency: 'Pronto',
    notes:
      'No es tóxica per se, pero nutricionalmente vacía y puede causar problemas digestivos. Mejor ofrecer lechugas de hojas oscuras (romana, escarola) con más fibra.',
    category: 'verdura',
    sources: [
      'Rabbit Medicine (Harcourt-Brown)',
      'House Rabbit Society',
      'Exotic Animal Formulary',
    ],
  },

  // ============================================
  // ESPECÍFICO PARA HURONES
  // ============================================
  {
    id: 'xilitol-huron',
    name: 'Xilitol (Hurones)',
    nameEn: 'Xylitol (Ferrets)',
    toxicity: 'Alta',
    species: ['huron'],
    toxicComponent: 'Xilitol',
    mechanismOfAction:
      'Los hurones son extremadamente sensibles. Causa hipoglucemia profunda y fallo hepático similar a perros pero con dosis mucho menores.',
    symptoms: 'Colapso súbito, convulsiones, debilidad extrema, vómitos, ictericia, coma',
    onsetTime: '15-30 minutos',
    treatmentUrgency: 'Inmediata',
    notes:
      'NUNCA dar productos "sin azúcar" a hurones. Verificar ingredientes de cualquier golosina. La sensibilidad es similar o mayor que en perros.',
    lethalDose: 'Dosis muy pequeñas pueden ser fatales - evitar completamente',
    category: 'dulce',
    sources: [
      'Ferret Medicine and Surgery (Lewington)',
      'Pet Poison Helpline',
      'Exotic Animal Formulary',
    ],
  },

  // ============================================
  // MEDIA TOXICIDAD
  // ============================================
  {
    id: 'huesos-cocidos',
    name: 'Huesos Cocidos',
    nameEn: 'Cooked Bones',
    toxicity: 'Media',
    species: ['perro', 'gato', 'huron'],
    toxicComponent: 'Fragmentos óseos astillados',
    mechanismOfAction:
      'La cocción desnaturaliza el colágeno, haciendo los huesos quebradizos. Las astillas pueden perforar esófago, estómago o intestinos, causando peritonitis.',
    symptoms:
      'Asfixia, tos, arcadas, vómitos (posiblemente con sangre), dolor abdominal, estreñimiento severo, letargo, fiebre (si hay perforación)',
    onsetTime: 'Inmediato a 24-48 horas',
    treatmentUrgency: 'Urgente',
    notes:
      'Los huesos de pollo y pavo son especialmente peligrosos. Huesos crudos son más seguros pero aún con riesgo. Nunca dar huesos cocidos.',
    category: 'carne',
    sources: ['ASPCA', 'FDA', 'Veterinary Emergency Medicine'],
  },
  {
    id: 'leche',
    name: 'Leche y Lácteos',
    nameEn: 'Milk and Dairy',
    toxicity: 'Media',
    species: ['perro', 'gato', 'conejo', 'hamster', 'cobayo', 'huron'],
    toxicComponent: 'Lactosa',
    mechanismOfAction:
      'La mayoría de animales adultos carecen de lactasa suficiente. La lactosa no digerida fermenta en el intestino, causando producción de gas y diarrea osmótica.',
    symptoms: 'Diarrea, vómitos, gases, dolor abdominal, distensión, deshidratación',
    onsetTime: '2-12 horas',
    treatmentUrgency: 'Pronto',
    notes:
      'Los gatos son especialmente sensibles (el mito de "dar leche a gatos" es dañino). El queso tiene menos lactosa. El yogur puede ser tolerado mejor.',
    category: 'lacteo',
    sources: ['ASPCA', 'Merck Veterinary Manual', "Cat Owner's Home Veterinary Handbook"],
  },
  {
    id: 'sal',
    name: 'Sal (en exceso)',
    nameEn: 'Salt (excess)',
    toxicity: 'Media',
    species: ['perro', 'gato', 'conejo', 'hamster', 'cobayo', 'huron'],
    toxicComponent: 'Cloruro de sodio',
    mechanismOfAction:
      'El exceso de sodio causa hipernatremia. El agua sale de las células cerebrales por ósmosis, causando deshidratación celular y edema cerebral cuando se corrige rápidamente.',
    symptoms:
      'Sed excesiva, micción frecuente, vómitos, diarrea, temblores, convulsiones, edema cerebral, coma',
    onsetTime: '1-4 horas',
    treatmentUrgency: 'Urgente',
    notes:
      'Snacks salados, agua de mar, masa de play-doh, sal de deshielo. Los animales pequeños son más susceptibles por su bajo peso corporal.',
    lethalDose: 'Perros: >4g/kg de peso corporal',
    category: 'condimento',
    sources: ['ASPCA', 'Merck Veterinary Manual', 'Pet Poison Helpline'],
  },
  {
    id: 'nuez-moscada',
    name: 'Nuez Moscada',
    nameEn: 'Nutmeg',
    toxicity: 'Media',
    species: ['perro', 'gato'],
    toxicComponent: 'Miristicina',
    mechanismOfAction:
      'La miristicina tiene propiedades alucinógenas y puede metabolizarse a compuestos similares a anfetaminas. Afecta el sistema nervioso central.',
    symptoms:
      'Alucinaciones, desorientación, aumento del ritmo cardíaco, hipertensión, dolor abdominal, convulsiones (dosis altas)',
    onsetTime: '1-6 horas',
    treatmentUrgency: 'Urgente',
    notes:
      'Común en productos horneados navideños (eggnog, galletas, pasteles de calabaza). Una cucharadita puede causar toxicidad.',
    category: 'condimento',
    sources: ['ASPCA', 'Pet Poison Helpline', 'Veterinary Toxicology (Gupta)'],
  },
  {
    id: 'masa-cruda',
    name: 'Masa con Levadura (cruda)',
    nameEn: 'Raw Yeast Dough',
    toxicity: 'Media',
    species: ['perro', 'gato'],
    toxicComponent: 'Levadura activa + producción de etanol',
    mechanismOfAction:
      'La masa se expande en el estómago caliente, causando distensión gástrica y posible torsión. La fermentación produce etanol, causando intoxicación alcohólica.',
    symptoms:
      'Distensión abdominal severa, dolor, vómitos improductivos, incoordinación, depresión, hipotermia, coma',
    onsetTime: '30 minutos - 2 horas',
    treatmentUrgency: 'Urgente',
    notes:
      'Emergencia quirúrgica si hay torsión gástrica. El etanol producido puede alcanzar niveles tóxicos. Pan ya horneado es seguro.',
    category: 'otro',
    sources: ['ASPCA', 'Merck Veterinary Manual', 'Veterinary Emergency Medicine'],
  },
  {
    id: 'puerro',
    name: 'Puerro',
    nameEn: 'Leek',
    toxicity: 'Media',
    species: ['perro', 'gato', 'ave', 'conejo'],
    toxicComponent: 'Tiosulfato (familia Allium)',
    mechanismOfAction:
      'Mismo mecanismo que cebolla/ajo. Los compuestos organosulfurados oxidan la hemoglobina, causando formación de cuerpos de Heinz y hemólisis.',
    symptoms: 'Debilidad, letargo, encías pálidas, vómitos, anemia, orina oscura',
    onsetTime: '1-5 días para anemia clínica',
    treatmentUrgency: 'Urgente',
    notes: 'Menos tóxico que ajo y cebolla pero aún peligroso. Común en sopas y guisos.',
    category: 'verdura',
    sources: ['ASPCA', 'Merck Veterinary Manual'],
  },
  {
    id: 'cebollino',
    name: 'Cebollino/Ciboulette',
    nameEn: 'Chives',
    toxicity: 'Media',
    species: ['perro', 'gato'],
    toxicComponent: 'Tiosulfato (familia Allium)',
    mechanismOfAction:
      'Oxidación de hemoglobina y formación de cuerpos de Heinz, causando anemia hemolítica.',
    symptoms: 'Irritación gastrointestinal, babeo, vómitos, anemia, debilidad',
    onsetTime: '1-5 días para anemia clínica',
    treatmentUrgency: 'Urgente',
    notes: 'Común como hierba culinaria. Los gatos son más sensibles que los perros.',
    category: 'condimento',
    sources: ['ASPCA', 'Pet Poison Helpline'],
  },
  {
    id: 'tomate-verde',
    name: 'Tomate Verde (planta)',
    nameEn: 'Green Tomato (plant)',
    toxicity: 'Media',
    species: ['perro', 'gato', 'conejo', 'cobayo'],
    toxicComponent: 'Solanina y tomatina (alcaloides glicoalcaloides)',
    mechanismOfAction:
      'Los alcaloides alteran la permeabilidad de membranas celulares e inhiben la acetilcolinesterasa, afectando la transmisión nerviosa.',
    symptoms: 'Babeo excesivo, vómitos, diarrea, letargo, debilidad, confusión, bradicardia',
    onsetTime: '2-6 horas',
    treatmentUrgency: 'Pronto',
    notes:
      'El tomate MADURO (rojo) es seguro. Las hojas, tallos, y tomates verdes son tóxicos. Los jardines con tomates deben ser inaccesibles.',
    category: 'verdura',
    sources: ['ASPCA', 'Merck Veterinary Manual'],
  },
  {
    id: 'papa-cruda',
    name: 'Papa Cruda/Verde',
    nameEn: 'Raw/Green Potato',
    toxicity: 'Media',
    species: ['perro', 'gato', 'conejo', 'cobayo'],
    toxicComponent: 'Solanina (glicoalcaloide)',
    mechanismOfAction:
      'La solanina inhibe la acetilcolinesterasa y altera la permeabilidad de membranas. Se concentra en partes verdes y brotes.',
    symptoms: 'Vómitos, diarrea, dolor abdominal, letargo, debilidad, confusión, temblores',
    onsetTime: '2-6 horas',
    treatmentUrgency: 'Pronto',
    notes:
      'Las papas COCIDAS son seguras. Evitar: papas verdes, con brotes, cáscaras verdes. La cocción reduce pero no elimina completamente la solanina en partes verdes.',
    category: 'verdura',
    sources: ['FDA', 'Merck Veterinary Manual', 'ASPCA'],
  },
  {
    id: 'champinones-silvestres',
    name: 'Champiñones Silvestres',
    nameEn: 'Wild Mushrooms',
    toxicity: 'Alta',
    species: ['perro', 'gato', 'conejo'],
    toxicComponent: 'Varias toxinas según especie (amatoxinas, muscarina, psilocibina, etc.)',
    mechanismOfAction:
      'Depende del hongo. Amanita: inhibe RNA polimerasa II, causando fallo hepático. Muscarina: estimula receptores muscarínicos. Otros afectan riñones, SNC.',
    symptoms:
      'Variables: vómitos, diarrea, dolor abdominal, salivación, ictericia, alucinaciones, convulsiones, fallo hepático/renal, muerte',
    onsetTime: '30 minutos - 24 horas (algunos 3-7 días para síntomas hepáticos)',
    treatmentUrgency: 'Inmediata',
    notes:
      'ASUMIR que cualquier hongo silvestre es tóxico. Los champiñones de supermercado son seguros. Si hay ingestión, llevar muestra del hongo al veterinario.',
    category: 'verdura',
    sources: ['ASPCA', 'North American Mycological Association', 'Veterinary Toxicology (Gupta)'],
  },
  {
    id: 'helado',
    name: 'Helado',
    nameEn: 'Ice Cream',
    toxicity: 'Media',
    species: ['perro', 'gato'],
    toxicComponent: 'Lactosa, azúcar, posible xilitol, chocolate',
    mechanismOfAction:
      'Combinación de intolerancia a lactosa, alto contenido calórico, y posibles ingredientes tóxicos (xilitol en "sin azúcar", chocolate, nueces de macadamia).',
    symptoms:
      'Diarrea, vómitos, dolor abdominal. Si contiene xilitol: convulsiones, colapso. Si contiene chocolate: arritmias.',
    onsetTime: '2-6 horas (GI), 30 min (xilitol)',
    treatmentUrgency: 'Pronto',
    notes:
      'VERIFICAR ingredientes. Los helados "sin azúcar", de chocolate, o con nueces son especialmente peligrosos. Pequeñas cantidades de helado de vainilla regular son generalmente toleradas.',
    category: 'lacteo',
    sources: ['ASPCA', 'Pet Poison Helpline'],
  },
  {
    id: 'dulces',
    name: 'Dulces/Golosinas',
    nameEn: 'Candy/Sweets',
    toxicity: 'Media',
    species: ['perro', 'gato', 'ave', 'conejo', 'hamster', 'cobayo', 'huron'],
    toxicComponent: 'Azúcar, posible xilitol, colorantes artificiales',
    mechanismOfAction:
      'El azúcar causa picos de glucosa y posible pancreatitis. El xilitol en dulces "sin azúcar" causa hipoglucemia severa. Colorantes pueden causar alergias.',
    symptoms:
      'Vómitos, diarrea, hiperactividad, obesidad (crónico). Con xilitol: colapso, convulsiones.',
    onsetTime: 'Variable',
    treatmentUrgency: 'Pronto',
    notes:
      'Los dulces "sin azúcar" son ESPECIALMENTE peligrosos por el xilitol. Chicles, mentas, caramelos "sugar-free" contienen xilitol. Halloween es época de alto riesgo.',
    category: 'dulce',
    sources: ['ASPCA', 'FDA', 'Pet Poison Helpline'],
  },
  {
    id: 'almendras-amargas',
    name: 'Almendras Amargas',
    nameEn: 'Bitter Almonds',
    toxicity: 'Alta',
    species: ['perro', 'gato', 'ave', 'conejo', 'hamster', 'cobayo'],
    toxicComponent: 'Amigdalina (libera cianuro)',
    mechanismOfAction:
      'La amigdalina se hidroliza a cianuro de hidrógeno (HCN). El cianuro bloquea la citocromo c oxidasa, impidiendo el uso de oxígeno a nivel celular.',
    symptoms:
      'Dificultad respiratoria, jadeo, encías rojo cereza brillante, pupilas dilatadas, convulsiones, colapso, muerte',
    onsetTime: '15-60 minutos',
    treatmentUrgency: 'Inmediata',
    notes:
      'Las almendras DULCES (de supermercado) son seguras en pequeñas cantidades. Las almendras amargas son ilegales en EE.UU. pero disponibles en otros países. El extracto de almendra amarga es concentrado.',
    lethalDose: 'Almendras amargas: 7-10 semillas pueden ser fatales para un niño pequeño o animal',
    category: 'nuez',
    sources: ['FDA', 'Merck Veterinary Manual', 'Veterinary Toxicology (Gupta)'],
  },
  {
    id: 'pan-aves',
    name: 'Pan (para aves)',
    nameEn: 'Bread (for birds)',
    toxicity: 'Baja',
    species: ['ave'],
    toxicComponent: 'Bajo valor nutricional, carbohidratos simples',
    mechanismOfAction:
      'El pan llena sin nutrir, causando "junk food effect". En patos jóvenes, la malnutrición por dieta de pan causa "angel wing" (deformidad alar irreversible).',
    symptoms:
      'Desnutrición, debilidad, plumas pobres, angel wing (patos jóvenes), susceptibilidad a enfermedades',
    onsetTime: 'Crónico (semanas de dieta inadecuada)',
    treatmentUrgency: 'Pronto',
    notes:
      'No es tóxico agudamente pero nutricionalmente dañino. Las aves silvestres alimentadas con pan en parques desarrollan deficiencias. Ofrecer semillas, granos, vegetales en su lugar.',
    category: 'otro',
    sources: ['Audubon Society', 'Avian Medicine (Ritchie)', 'RSPB'],
  },

  // ============================================
  // BAJA TOXICIDAD
  // ============================================
  {
    id: 'limon',
    name: 'Limón y Cítricos',
    nameEn: 'Lemon and Citrus',
    toxicity: 'Baja',
    species: ['perro', 'gato'],
    toxicComponent: 'Aceites esenciales (limoneno, linalool) y psoralenos',
    mechanismOfAction:
      'Los aceites esenciales irritan el tracto GI. Los psoralenos pueden causar fotosensibilización. Los gatos carecen de enzimas para metabolizar estos compuestos.',
    symptoms:
      'Vómitos, diarrea, babeo, dermatitis (contacto), fotosensibilidad (grandes cantidades)',
    onsetTime: '1-4 horas',
    treatmentUrgency: 'Pronto',
    notes:
      'La pulpa ocasional es generalmente segura. Las cáscaras, semillas y aceites esenciales son más problemáticos. Los productos de limpieza cítricos también pueden ser irritantes.',
    category: 'fruta',
    sources: ['ASPCA', 'Pet Poison Helpline'],
  },
  {
    id: 'coco',
    name: 'Coco',
    nameEn: 'Coconut',
    toxicity: 'Baja',
    species: ['perro', 'gato'],
    toxicComponent: 'Alto contenido graso, potasio (agua de coco)',
    mechanismOfAction:
      'El alto contenido graso puede causar pancreatitis en animales susceptibles. El agua de coco es alta en potasio, lo cual puede afectar el corazón.',
    symptoms: 'Malestar estomacal, diarrea, posible pancreatitis (grandes cantidades)',
    onsetTime: '2-12 horas',
    treatmentUrgency: 'Pronto',
    notes:
      'Pequeñas cantidades de carne de coco son generalmente seguras. Evitar aceite de coco en exceso. El agua de coco no es recomendada.',
    category: 'fruta',
    sources: ['ASPCA'],
  },
  {
    id: 'cerezas',
    name: 'Cerezas (con hueso)',
    nameEn: 'Cherries (with pit)',
    toxicity: 'Media',
    species: ['perro', 'gato', 'ave'],
    toxicComponent: 'Cianuro (en hueso, tallos, hojas)',
    mechanismOfAction:
      'Los huesos contienen amigdalina que libera cianuro. Además, los huesos pueden causar obstrucción intestinal.',
    symptoms:
      'Dificultad respiratoria, encías rojas brillantes, dilatación pupilar, shock. Obstrucción: vómitos, dolor abdominal.',
    onsetTime: '15-60 min (cianuro), horas-días (obstrucción)',
    treatmentUrgency: 'Urgente',
    notes:
      'La PULPA es segura. El peligro está en huesos, tallos y hojas. Remover siempre el hueso antes de ofrecer.',
    category: 'fruta',
    sources: ['ASPCA', 'Pet Poison Helpline'],
  },
  {
    id: 'platano',
    name: 'Plátano (en exceso)',
    nameEn: 'Banana (excess)',
    toxicity: 'Baja',
    species: ['perro', 'gato', 'conejo', 'hamster'],
    toxicComponent: 'Alto contenido de azúcar y potasio',
    mechanismOfAction:
      'El azúcar puede contribuir a obesidad y diabetes. El alto potasio puede ser problemático para animales con enfermedad renal.',
    symptoms: 'Estreñimiento (cáscaras), diarrea (exceso), aumento de peso',
    onsetTime: 'Variable',
    treatmentUrgency: 'Pronto',
    notes:
      'Seguro como premio ocasional en pequeñas cantidades. Las cáscaras son difíciles de digerir. Evitar en animales diabéticos o con enfermedad renal.',
    category: 'fruta',
    sources: ['ASPCA'],
  },
  {
    id: 'comida-condimentada',
    name: 'Comida Condimentada/Picante',
    nameEn: 'Spicy Food',
    toxicity: 'Baja',
    species: ['perro', 'gato', 'conejo', 'hamster', 'cobayo'],
    toxicComponent: 'Capsaicina y otros irritantes',
    mechanismOfAction:
      'La capsaicina activa los receptores TRPV1, causando sensación de quemazón. Los animales no toleran bien las especias y sufren irritación GI.',
    symptoms: 'Vómitos, diarrea, dolor abdominal, sed excesiva, malestar general',
    onsetTime: '1-4 horas',
    treatmentUrgency: 'Pronto',
    notes:
      'Los animales no disfrutan ni procesan especias como los humanos. Evitar compartir comida condimentada. La pimienta, chile, curry, etc. causan malestar.',
    category: 'condimento',
    sources: ['ASPCA'],
  },
  {
    id: 'granada',
    name: 'Granada',
    nameEn: 'Pomegranate',
    toxicity: 'Baja',
    species: ['perro', 'gato'],
    toxicComponent: 'Taninos, semillas (riesgo de obstrucción)',
    mechanismOfAction:
      'Los taninos pueden causar irritación gástrica. Las semillas en grandes cantidades pueden causar obstrucción o estreñimiento.',
    symptoms: 'Vómitos, malestar estomacal, posible estreñimiento',
    onsetTime: '2-6 horas',
    treatmentUrgency: 'Pronto',
    notes:
      'No es realmente tóxica pero puede causar malestar digestivo. Las semillas son difíciles de digerir. Pequeñas cantidades ocasionales son generalmente toleradas.',
    category: 'fruta',
    sources: ['ASPCA'],
  },
]

// Species labels in Spanish
export const SPECIES_LABELS: Record<Species, string> = {
  perro: 'Perro',
  gato: 'Gato',
  ave: 'Ave',
  conejo: 'Conejo',
  tortuga: 'Tortuga',
  hamster: 'Hámster',
  cobayo: 'Cobayo/Cuy',
  huron: 'Hurón',
  reptil: 'Reptil/Lagarto',
}

// Category labels in Spanish
export const CATEGORY_LABELS: Record<string, string> = {
  fruta: 'Frutas',
  verdura: 'Verduras',
  dulce: 'Dulces',
  bebida: 'Bebidas',
  condimento: 'Condimentos',
  lacteo: 'Lácteos',
  carne: 'Carnes',
  nuez: 'Nueces/Semillas',
  planta: 'Plantas',
  insecto: 'Insectos',
  otro: 'Otros',
}

// Authoritative sources with URLs
export const DATA_SOURCES = [
  {
    name: 'ASPCA Animal Poison Control',
    url: 'https://www.aspca.org/pet-care/animal-poison-control',
    description: 'Centro de control de envenenamiento animal más grande del mundo',
  },
  {
    name: 'Pet Poison Helpline',
    url: 'https://www.petpoisonhelpline.com/poisons/',
    description: 'Base de datos de venenos que cubre todas las especies',
  },
  {
    name: 'Merck Veterinary Manual',
    url: 'https://www.merckvetmanual.com/toxicology',
    description: 'Referencia médica profesional para veterinarios',
  },
  {
    name: 'FDA - Animal Health',
    url: 'https://www.fda.gov/animal-veterinary/animal-health-literacy/potentially-dangerous-items-your-pet',
    description: 'Administración de Alimentos y Medicamentos de EE.UU.',
  },
]

// Emergency contacts
export const EMERGENCY_CONTACTS = {
  aspca: {
    name: 'ASPCA Poison Control',
    phone: '(888) 426-4435',
    note: 'Puede aplicar tarifa de consulta',
    available: '24/7',
  },
  petPoisonHelpline: {
    name: 'Pet Poison Helpline',
    phone: '(800) 213-6680',
    note: 'Puede aplicar tarifa de consulta',
    available: '24/7',
  },
}

// Utility functions
export function getFoodsForSpecies(species: Species): ToxicFoodItem[] {
  return TOXIC_FOODS.filter((food) => food.species.includes(species))
}

export function getFoodsByToxicity(toxicity: 'Alta' | 'Media' | 'Baja'): ToxicFoodItem[] {
  return TOXIC_FOODS.filter((food) => food.toxicity === toxicity)
}

export function getFoodsByCategory(category: string): ToxicFoodItem[] {
  return TOXIC_FOODS.filter((food) => food.category === category)
}

export function searchFoods(query: string, species?: Species): ToxicFoodItem[] {
  const normalizedQuery = query.toLowerCase().trim()

  return TOXIC_FOODS.filter((food) => {
    const matchesSearch =
      food.name.toLowerCase().includes(normalizedQuery) ||
      food.nameEn.toLowerCase().includes(normalizedQuery) ||
      food.symptoms.toLowerCase().includes(normalizedQuery) ||
      food.toxicComponent.toLowerCase().includes(normalizedQuery)

    if (!species) return matchesSearch

    return matchesSearch && food.species.includes(species)
  })
}

export function getHighRiskFoodsForSpecies(species: Species): ToxicFoodItem[] {
  return TOXIC_FOODS.filter((food) => food.species.includes(species) && food.toxicity === 'Alta')
}
