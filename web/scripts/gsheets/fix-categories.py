#!/usr/bin/env python3
"""
Product Categorization Fixer
Analyzes and fixes product categories in JSON files
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DATA_DIR = Path(__file__).parent.parent.parent / "db" / "99_seed" / "data"
PRODUCTS_DIR = DATA_DIR / "products"


def categorize_product(name: str, current_cat: str = '') -> str:
    """Categorize a product based on its name"""
    name_upper = name.upper()

    # Species detection - PRIORITY
    is_cat_product = any(k in name_upper for k in [
        'GATO', ' CAT ', 'CAT ', ' CAT', 'GATITO', 'KITTEN', 'FELINO', 'FELINE',
        'CATCHOW', 'CAT CHOW'
    ])
    is_dog_product = any(k in name_upper for k in [
        'PERRO', ' DOG ', 'DOG ', ' DOG', 'CACHORRO', 'PUPPY', 'CANINO', 'CANINE'
    ])

    # ===== CLINICAL EQUIPMENT =====
    # Laboratory Equipment
    if any(k in name_upper for k in ['CENTRIFUGA', 'CENTRÍFUGA', 'MICROPIPETA',
                                       'MICROSCOPIO', 'BAÑO MARIA', 'BAÑO MARÍA',
                                       'ESTUFA DE LABORATORIO']):
        return 'CLI-EQU-LAB'

    # Anesthesia equipment
    if any(k in name_upper for k in ['MAQUINA DE ANESTESIA', 'MÁQUINA DE ANESTESIA',
                                       'VAPORIZADOR', 'ISOFLURANO', 'SEVOFLURANO',
                                       'MONITOR MULTIPARAMETRICO', 'MONITOR MULTIPARAMÉTRICO',
                                       'PULSIOXIMETRO', 'PULSIOXÍMETRO', 'CAPNOGRAFO', 'CAPNÓGRAFO',
                                       'CIRCUITO BAIN', 'CIRCUITO CIRCULAR', 'CAL SODADA',
                                       'MASCARA FACIAL', 'MÁSCARA FACIAL', 'MASCARAS FACIALES',
                                       'MÁSCARAS FACIALES', 'REANIMADOR', 'AMBU',
                                       'BOLSAS DE REINHALACION', 'BOLSAS DE REINHALACIÓN']):
        return 'CLI-EQU-ANE'

    # Diagnostic equipment
    if any(k in name_upper for k in ['ESTETOSCOPIO', 'OTOSCOPIO', 'OFTALMOSCOPIO',
                                       'TERMOMETRO', 'TERMÓMETRO', 'APARATO DE PRESION',
                                       'APARATO DE PRESIÓN', 'LITTMANN', 'WELCH ALLYN',
                                       'ANALIZADOR', 'CATALYST', 'PROCYTE', 'BASCULA',
                                       'BÁSCULA']):
        return 'CLI-EQU-DIA'

    # Surgical instruments and kits
    if any(k in name_upper for k in ['MANGO DE BISTURI', 'MANGO DE BISTURÍ',
                                       'PORTA AGUJAS', 'PINZA KELLY', 'PINZA MOSQUITO',
                                       'PINZA ALLIS', 'PINZA BABCOCK', 'PINZA KOCHER',
                                       'TIJERA MAYO', 'TIJERA METZENBAUM',
                                       'GRAPADORA DE PIEL', 'REMOVEDOR DE GRAPAS',
                                       'ELECTROBISTURI', 'ELECTROBISTURÍ',
                                       'LAPIZ PARA ELECTRO', 'LÁPIZ PARA ELECTRO',
                                       'SEPARADOR SENN', 'SEPARADOR GELPI',
                                       'RETRACTOR', 'FORCEPS',
                                       'SET QUIRURGICO', 'SET QUIRÚRGICO',
                                       'KIT QUIRURGICO', 'KIT QUIRÚRGICO']):
        return 'CLI-EQU-INS'

    # Mobility equipment
    if any(k in name_upper for k in ['CAMILLA', 'MESA DE MAYO', 'MESA DE INSPECCION',
                                       'MESA DE INSPECCIÓN', 'SOPORTE SUERO', 'BIOMBO']):
        return 'CLI-EQU-MOB'

    # ===== CLINICAL PHARMACY =====
    # Neurology
    if any(k in name_upper for k in ['EPIPHEN', 'FENOBARBITAL', 'LEVETIRACETAM']):
        return 'CLI-FAR-NEU'

    # Vaccines
    if any(k in name_upper for k in ['VACUNA', 'NOBIVAC', 'VACCINE', 'DHPP', 'QUINTUPLE',
                                       'EURICAN', 'RABISIN', 'PUREVAX', 'RECOMBITEK']):
        return 'CLI-FAR-VAC'

    # Antibiotics
    if any(k in name_upper for k in ['AMOXICILINA', 'CEFALEXINA', 'ENROFLOXACINA',
                                       'METRONIDAZOL', 'DOXICICLINA', 'AZITROMICINA', 'AGEMOXI',
                                       'MARBOCYL', 'MARBOFLOXACINA', 'CLAVULANATO']):
        return 'CLI-FAR-ANB'

    # Anti-inflammatories (also GI meds like omeprazole)
    if any(k in name_upper for k in ['MELOXICAM', 'CARPROFENO', 'PREDNISOLONA',
                                       'DEXAMETASONA', 'KETOPROFENO', 'ANALGESIN', 'PREVICOX',
                                       'TOLFEDINE', 'TOLFENÁMICO', 'RIMADYL',
                                       'GAVIZ', 'OMEPRAZOL', 'MELOXI ', ' MELOXI']):
        return 'CLI-FAR-AIN'

    # Fluids
    if any(k in name_upper for k in ['SUERO FISIOLOGICO', 'SUERO FISIOLÓGICO',
                                       'RINGER', 'DEXTROSA', 'SOLUCION SALINA',
                                       'SOLUCIÓN SALINA']):
        return 'CLI-FAR-FLU'

    # ===== CLINICAL CONSUMABLES =====
    # Lab consumables
    if any(k in name_upper for k in ['SNAP 4DX', 'SNAP PARVO', 'SNAP GIARDIA', 'SNAP FIV',
                                       'SNAP CPL', 'VACUTAINER', 'TUBO EDTA',
                                       'PORTAOBJETO', 'TEST RAPIDO', 'TEST RÁPIDO',
                                       'TIRAS DE URIAN', 'REACTIVO']):
        return 'CLI-INS-LAB'

    # Surgical consumables / Sutures / Tubes
    if any(k in name_upper for k in ['SUTURA', 'VICRYL', 'MONOCRYL', 'PDS II',
                                       'PROLENE', 'ETHILON', 'MONONYLON', 'SEDA 3-0',
                                       'HOJAS DE BISTURI', 'HOJAS DE BISTURÍ',
                                       'BAJALENGUA', 'COLECTOR DE ORINA',
                                       'SONDA DE ASPIRACION', 'SONDA DE ASPIRACIÓN',
                                       'SONDA ENDOTRAQUEAL', 'SONDA NASOGASTRICA',
                                       'SONDA NASOGÁSTRICA', 'SONDA URETRAL',
                                       'SONDA FOLEY', 'SONDA ALIMENTACION',
                                       'TUBO ENDOTRAQUEAL', 'TUBOS ENDOTRAQUEALES',
                                       'LARINGOSCOPIO']):
        return 'CLI-INS-QUI'

    # Syringes/Needles/IV
    if any(k in name_upper for k in ['JERINGA', 'JERINGA BD', 'AGUJA ', 'AGUJAS BD',
                                       'CATETER IV', 'CATÉTER IV',
                                       'SET DE INFUSION', 'SET DE INFUSIÓN',
                                       'SET DE EXTENSION', 'SET DE EXTENSIÓN',
                                       'MICROINFUSION', 'MICROINFUSIÓN',
                                       'LLAVE DE 3 VIAS', 'LLAVE DE 3 VÍAS',
                                       'MARIPOSA BD', 'PUERTO DE INYECCION',
                                       'PUERTO DE INYECCIÓN']):
        return 'CLI-INS-AGU'

    # PPE
    if any(k in name_upper for k in ['GUANTES DE NITRILO', 'GUANTES DE LATEX',
                                       'GUANTES DE LÁTEX', 'GUANTES QUIRURGICOS',
                                       'GUANTES QUIRÚRGICOS', 'MASCARILLA',
                                       'BATA QUIRURGICA', 'BATA QUIRÚRGICA',
                                       'BATA DESCART', 'CONTENEDOR DE DESECHOS',
                                       'DESCARTEX', 'GORROS QUIRURGICOS', 'GORROS QUIRÚRGICOS',
                                       'CUBRE ZAPATOS', 'CAMPOS QUIRURGICOS', 'CAMPOS QUIRÚRGICOS']):
        return 'CLI-INS-EPP'

    # Bandages
    if any(k in name_upper for k in ['GASA HIDROFILA', 'GASA HIDRÓFILA', 'GASA EN ROLLO',
                                       'GASAS ESTERILES', 'GASAS ESTÉRILES',
                                       'VENDA ELASTICA', 'VENDA ELÁSTICA', 'VENDA COHESIVA',
                                       'ALGODON HIDROFILO', 'ALGODÓN HIDRÓFILO',
                                       'ESPARADRAPO', 'MICROPORE', 'CINTA QUIRURGICA',
                                       'CINTA QUIRÚRGICA', 'TORUNDAS']):
        return 'CLI-INS-VEN'

    # ===== PHARMACY (OTC) =====
    # Antiparasitics - External
    if any(k in name_upper for k in ['FRONTLINE', 'NEXGARD', 'BRAVECTO', 'SIMPARICA',
                                       'ADVANTAGE', 'SERESTO', 'SCALIBOR', 'EFFIPRO',
                                       'HECTORPAR', 'HECTOPAR', 'ECTOGAL', 'FIPROTECTOR', 'FIPRONIL',
                                       'PERMETRINA', 'TALCO ANTIPULGA']):
        return 'FAR-ANT-EXT'
    if any(k in name_upper for k in ['PIPETA ANTI', 'ANTIPULGA', 'ANTIGARRAPATA']):
        return 'FAR-ANT-EXT'
    if 'COLLAR ANTIPARASITARIO' in name_upper or 'COLLAR ANTI PULGA' in name_upper:
        return 'FAR-ANT-EXT'

    # Antiparasitics - Internal
    if any(k in name_upper for k in ['DRONTAL', 'VERMIFUGO', 'VERMÍFUGO', 'DESPARASITANTE',
                                       'ANTIPARASITARIO APTO', 'BASKEN', 'FENTEL', 'VERMINOL',
                                       'ANTIHELMINT', 'DESPARASITAN']):
        return 'FAR-ANT-INT'

    # Joint Supplements
    if any(k in name_upper for k in ['ARTRIN', 'CONDROVET', 'COSEQUIN', 'ARTROFLEX']):
        return 'FAR-SUP-ART'

    # Supplements/Vitamins (including calming/behavioral/liver)
    if any(k in name_upper for k in ['VITAMINA', 'OMEGA 3', 'GLICOPAN', 'HEMOLITAN',
                                       'SUPLEMENTO', 'AMINOMIX', 'ORGANEW', 'CONDROTON',
                                       'FELIWAY', 'ADAPTIL', 'CALCI PLUS', 'PELO E DERME',
                                       'NUTRIBOUND', 'ZYLKENE', 'ANXITANE', 'IPAKITINE',
                                       'NUTRICAM', 'ANAVIMIN', 'BIOMODULADOR', 'OHM ',
                                       'CALMANTE', 'RELAJANTE', 'CALMING',
                                       'KUALCOHEPAT', 'HEPATO', 'MEGA MATER', 'FERTIL']):
        return 'FAR-SUP-VIT'

    # Probiotics / Digestive / Anti-hairball
    if any(k in name_upper for k in ['PROBIOTICO', 'PROBIÓTICO', 'FORTIFLORA', 'PRO-KOLIN',
                                       'KOPROFAGIA', 'BALL FREE', 'ANTI BOLAS DE PELO',
                                       'HAIRBALL', 'MALTA']):
        return 'FAR-SUP-DIG'

    # Dermatology topicals / Antifungals
    if any(k in name_upper for k in ['POMADA', 'CREMA DERMA', 'SPRAY CICATRIZ', 'ALLERDERM',
                                       'KUALCODERM', 'CREMA CICATRIZ', 'UNGÜENTO', 'UNGUENTO',
                                       'CREMA ANTIMICO', 'CREMA ANTIFUNG', 'CREMA HIDRAT',
                                       'DERMIL', 'DERMOMICINA', 'CLORHPET', 'CLOREXHIDINA',
                                       'ANTISEPTICO', 'ANTISÉPTICO', 'GLICOL PET',
                                       'ITRACONAZOL', 'KETOCONAZOL', 'LABYDERM']):
        return 'FAR-DER-TOP'

    # Ear/Eye medications
    if any(k in name_upper for k in ['OTOLOGICA', 'OTOLÓGICA', 'AURIZON', 'EASOTIC',
                                       'COLIRIO', 'CLEAN-UP', 'LIMPIADOR OIDO',
                                       'LIMPIADOR OÍDO', 'EPI-OTIC', 'LIMPIADOR OTICO',
                                       'LIMPIADOR ÓTICO', 'MOXIOFTAL', 'OFTALMICO', 'OFTÁLMICO']):
        return 'FAR-DER-OTI'

    # ===== EXOTIC NUTRITION =====
    # Fish food
    if any(k in name_upper for k in ['LABCON', 'ALCON COLOURS', 'TETRAMIN', 'ALIMENTO PECES',
                                       'ALCON BASIC', 'ALCON GOLD']):
        return 'NUT-EXO-PEC'

    # Bird food
    if any(k in name_upper for k in ['ALCON CLUB', 'MEZCLA CANARIO', 'SEMILLAS GIRASOL',
                                       'ALCON PSITA', 'ALIMENTO AVES', 'ALPISTE',
                                       'MISTURA PARA LORO', 'LORO', 'COTORRA', 'CACATUA']):
        return 'NUT-EXO-AVE'

    # ===== NUTRITION - Check species FIRST =====

    # Cat litter - check BEFORE food brands
    if any(k in name_upper for k in ['ARENA PARA GATO', 'ARENA HIGIENICA', 'ARENA HIGIÉNICA',
                                       'PIEDRA SANITARIA', 'ARENA AGLOMERANTE',
                                       'ARENA BIODEGRADABLE', 'ARENA NATURAL',
                                       'ARENA LAVANDA', 'ARENA PERFUMADA', 'ARENA SILICE',
                                       'ARENA SÍLICE', 'ARENA BABY POWDER',
                                       'BIOKITTY', 'CATRON', 'KETS ARENA',
                                       'ARENA SANITARIA', 'ARENA AURA', 'ARENA TOI MOI',
                                       'GRANULADO HIGIENICO', 'GRANULADO HIGIÉNICO',
                                       'GRANULADO PARA GATOS', 'BIO PELLETS',
                                       'TOI MOI', 'SILICA GREAT', 'CRISTAL PARA GATO',
                                       'ARENA FLORA', 'ARENA NATURA', 'CLUMPING CAT']):
        return 'ACC-HIG-ARE'

    # Wet food detection - check BEFORE dry food
    is_wet_food = any(k in name_upper for k in ['SACHET', 'LATA ', ' LATA', 'POUCH',
                                                  'HUMEDO', 'HÚMEDO', 'SALSA', 'PATE', 'PATÉ',
                                                  'GELATINA', 'DELICIOSO', 'DELICATESSE'])

    # Cat wet food brands
    cat_wet_brands = ['WHISKAS', 'FELIX', 'SHEBA', 'GOURMET', 'FANCY FEAST']
    if any(k in name_upper for k in ['FELIX SENSATIONS', 'FELIX KITTEN',
                                       'SHEBA DELICATESSE', 'SHEBA FRESH',
                                       'GOURMET GOLD', 'GOURMET REVELATIONS']):
        return 'NUT-FEL-HUM'
    if is_wet_food and (is_cat_product or any(k in name_upper for k in cat_wet_brands)):
        return 'NUT-FEL-HUM'
    # Gourmet brand is always cat wet food
    if 'GOURMET' in name_upper:
        return 'NUT-FEL-HUM'

    # Dog wet food brands
    if any(k in name_upper for k in ['CESAR DELICIOSO', 'CESAR MULTIPACK', 'CESAR GOURMET']):
        return 'NUT-CAN-HUM'
    if is_wet_food and is_dog_product:
        return 'NUT-CAN-HUM'

    # Snacks - before dry food
    if any(k in name_upper for k in ['DENTASTIX', 'DREAMIES', 'TEMPTATION', 'PARTY MIX']):
        if is_cat_product:
            return 'NUT-FEL-SNA'
        return 'NUT-CAN-SNA'

    if any(k in name_upper for k in ['SNACK ', ' SNACK', 'PREMIO', 'TREAT', 'GALLETA',
                                       'BISCUIT', ' BITES', 'HUESO COMESTIBLE', 'DUDOGS',
                                       'COOKIE GOLDEN', 'COOKIE PREMIER', 'COOKIES',
                                       'HUESO MASTICABLE', 'HUESO HUMERO', 'HUESO NATURAL',
                                       'HUESO PALITO', 'HUESO FEMUR', 'GRAN CANI',
                                       'CARNAZA', 'OREJA DE CERDO', 'PATA DE POLLO',
                                       'GOLOSINA P/']):
        if 'TABLETA' not in name_upper:
            if is_cat_product or 'GATO' in name_upper:
                return 'NUT-FEL-SNA'
            return 'NUT-CAN-SNA'

    # Cat dry food brands
    cat_food_brands = ['MONELLO CAT', 'CAT CHOW', 'CATCHOW', 'MATISSE',
                       'THREE CATS', 'PRIMOGATO',
                       'BIRBO PREMIUM GATOS', 'BIRBO PREMIUM GATITOS',
                       'EXCELLENT GATOS', 'EXCELLENT GATITOS',
                       'MONELLO ADULT CAT', 'MONELLO KITTEN',
                       'WHISKAS ADULTO', 'WHISKAS GATITO', 'WHISKAS CASTRADO']
    if any(k in name_upper for k in cat_food_brands):
        return 'NUT-FEL-SEC'

    # Dog dry food brands
    dog_food_brands = ['MONELLO DOG', 'DOG CHOW', 'PEDIGREE', 'MIKDOG', 'LUPY DOG',
                       'PRO PLAN DOG', 'PRIORITA', 'THREE DOG',
                       'EXCELLENT DOG', 'GANADOR', 'PRIMOCAO',
                       'BIRBO PREMIUM ADULTOS', 'BIRBO PREMIUM CACHORROS',
                       'MONELLO ADULT DOG', 'MONELLO PUPPY', 'MONELLO PERRO',
                       'MONELLO TRADICIONAL', 'MONELLO LIGHT', 'MONELLO SELECT',
                       'EXCELLENT ADULTOS', 'EXCELLENT CACHORROS',
                       'POTE EVEREST', 'EVEREST ADULTO']
    if any(k in name_upper for k in dog_food_brands):
        return 'NUT-CAN-SEC'

    # General balanced food with species detection
    if any(k in name_upper for k in ['BALANCEADO', 'RATION', 'PIENSO', 'ALIMENTO SECO']):
        # VetLife therapeutic diets
        if 'VETLIFE' in name_upper or 'VET LIFE' in name_upper:
            if is_cat_product:
                return 'NUT-FEL-PRE'
            return 'NUT-CAN-PRE'
        if is_cat_product and not is_dog_product:
            return 'NUT-FEL-SEC'
        if is_dog_product or any(k in name_upper for k in ['ADULTO', 'CACHORRO', 'SENIOR']):
            return 'NUT-CAN-SEC'

    # Brand-based detection with species awareness
    # Formula Natural
    if 'FORMULA NATURAL' in name_upper or 'FÓRMULA NATURAL' in name_upper:
        if is_cat_product:
            return 'NUT-FEL-SEC'
        return 'NUT-CAN-SEC'

    # N&D Farmina
    if 'N&D' in name_upper or 'FARMINA' in name_upper:
        if is_cat_product:
            return 'NUT-FEL-SEC'
        return 'NUT-CAN-SEC'

    # Pro Plan
    if 'PRO PLAN' in name_upper or 'PROPLAN' in name_upper:
        if is_cat_product:
            return 'NUT-FEL-SEC'
        return 'NUT-CAN-SEC'

    # Hills
    if 'HILL' in name_upper or 'SCIENCE DIET' in name_upper:
        if is_cat_product:
            if any(k in name_upper for k in ['PRESCRIPTION', 'VETERINARY']):
                return 'NUT-FEL-PRE'
            return 'NUT-FEL-SEC'
        if any(k in name_upper for k in ['PRESCRIPTION', 'VETERINARY']):
            return 'NUT-CAN-PRE'
        return 'NUT-CAN-SEC'

    # Vet Life / therapeutic diets
    if 'VET LIFE' in name_upper or 'VETLIFE' in name_upper:
        if is_cat_product:
            return 'NUT-FEL-PRE'
        return 'NUT-CAN-PRE'

    # Royal Canin
    if 'ROYAL CANIN' in name_upper:
        is_prescription = any(k in name_upper for k in ['GASTROINTESTINAL', 'RENAL',
                                                          'URINARY', 'HEPATIC', 'CARDIAC',
                                                          'HYPOALLERGENIC', 'DIABETIC'])
        if is_cat_product or any(k in name_upper for k in ['STERILISED', 'INDOOR', 'KITTEN']):
            if is_wet_food:
                return 'NUT-FEL-HUM'
            if is_prescription:
                return 'NUT-FEL-PRE'
            return 'NUT-FEL-SEC'
        if is_wet_food:
            return 'NUT-CAN-HUM'
        if is_prescription:
            return 'NUT-CAN-PRE'
        return 'NUT-CAN-SEC'

    # Vitalcan
    if 'VITALCAN' in name_upper:
        if is_cat_product:
            return 'NUT-FEL-SEC'
        return 'NUT-CAN-SEC'

    # Cibau
    if 'CIBAU' in name_upper:
        if is_cat_product:
            return 'NUT-FEL-SEC'
        return 'NUT-CAN-SEC'

    # Ganador
    if 'GANADOR' in name_upper:
        if is_cat_product:
            return 'NUT-FEL-SEC'
        return 'NUT-CAN-SEC'

    # Origens
    if 'ORIGENS' in name_upper:
        if is_cat_product:
            return 'NUT-FEL-SEC'
        return 'NUT-CAN-SEC'

    # Select
    if 'SELECT' in name_upper and ('NUTRICION' in name_upper or 'NUTRICIÓN' in name_upper or 'DIGESTION' in name_upper):
        return 'NUT-CAN-SEC'

    # ===== ACCESSORIES =====

    # Dental care products
    if any(k in name_upper for k in ['FRESH BREATH', 'ADITIVO ORAL', 'LIMPIADOR DENTAL',
                                       'GEL LIMPIADOR DE DIENTES', 'PASTA DENTAL',
                                       'CEPILLO DENTAL', 'CREMA DENTAL', 'C.E.T.']):
        return 'ACC-HIG-DEN'

    # Shampoo/Grooming cosmetics
    if any(k in name_upper for k in ['SHAMPOO', 'CHAMPU', 'CHAMPÚ', 'ACONDICIONADOR',
                                       'PERFUME', 'COLONIA', 'HIDRAPET', 'CLORESTEN',
                                       'TROPICLEAN', 'HYDRA COLOGNE', 'HYDRA COLGNE', 'JABON', 'JABÓN',
                                       'SUAVEPEL', 'PULGAFIN', 'BAÑO SECO', 'LYSOFORM',
                                       'DESINFECTANTE PET', 'NEUTRALIZADOR OLORES',
                                       'LIMPIA PATAS', 'ESPUMA LIMPIA', 'LIMPIADOR PATAS']):
        return 'ACC-HIG-SHA'

    # Grooming tools
    if any(k in name_upper for k in ['ALICATE', 'CORTAUNA', 'CORTA UÑA', 'CORTA UNA',
                                       'LIMA UÑA', 'FURMINATOR', 'CEPILLO', 'PEINE',
                                       'CARDINA', 'SLICKER', 'RASCADOR DE MADERA',
                                       'CLIPER']):
        if 'DENTAL' not in name_upper:
            return 'ACC-HIG-CEP'

    # Sanitary bags/pads/dispensers/diapers/training
    if any(k in name_upper for k in ['BOLSA SANITARIA', 'BOLSAS SANITARIAS', 'ABSORBENTE',
                                       'TAPETE HIGIENICO', 'TAPETE HIGIÉNICO',
                                       'DISPENSADOR BOLSA', 'BOMBACHITA', 'PAÑAL PERRO',
                                       'PAÑAL MACHO', 'EDUCADOR URINE', 'EDUCA PET',
                                       'REPELENTE EDUCADOR', 'ATRAYENTE']):
        return 'ACC-HIG-PAÑ'

    # Litter boxes and bathtubs
    if any(k in name_upper for k in ['BANDEJA SANITARIA', 'BANDEJA HIGIENICA',
                                       'BANDEJA HIGIÉNICA', 'ARENERO', 'LITTER BOX',
                                       'BAÑERA GATO', 'BAÑERA OVAL', 'BANDEJA P/ GATO',
                                       'BANDEJA INTELIGENTE', 'BANDEJA CLASSIC']):
        return 'ACC-HIG-BAN'

    # Collars/Leashes/Harnesses
    if any(k in name_upper for k in ['COLLAR ', ' COLLAR', 'CORREA', 'PRETAL', 'ARNES',
                                       'ARNÉS', 'GUIA ', ' GUIA', 'GUÍA', 'BOZAL',
                                       'PECHERA', 'TIRADOR']):
        if 'ANTIPARASITARIO' not in name_upper and 'ANTI PULGA' not in name_upper:
            return 'ACC-PAS-COL'

    # Carriers/Transport/Car accessories
    if any(k in name_upper for k in ['TRANSPORTADORA', 'BOLSO TRANSPORTE', 'CARRIER',
                                       'MOCHILA', 'BOLSA AEREA', 'BOLSA AÉREA',
                                       'CAJA DE TRANSPORTE', 'LOVE TRAVEL',
                                       'BOLSA DE TRANSPORTE', 'PET AERIAL', 'PET ATENAS',
                                       'PET GRECIA', 'PET IPANEMA', 'PET RED',
                                       'CAJA TRANSPORTE', 'VARI KENNEL', 'CUBRE ASIENTO',
                                       'PROTECTOR ASIENTO', 'RAMPA PLEGABLE']):
        return 'ACC-PAS-TRA'

    # Clothes
    if any(k in name_upper for k in ['CHALECO', 'IMPERMEABLE', 'ABRIGO', 'CAMISETA PET',
                                       'BANDANA', 'ROPA PARA PERRO']):
        return 'ACC-PAS-ROP'

    # Beds/Stairs/Mats
    if any(k in name_upper for k in ['CAMA ', 'CAMA PARA', 'COLCHON', 'COLCHÓN', 'COLCHONETA',
                                       'SLEEPER', 'PET COOL', 'CAMA CLOUD', 'DONUT CAMA',
                                       'ESCALERA PET', 'ESCALERA MASCOTA', 'RAMPA PET']):
        return 'ACC-DES-CAM'

    # Houses/Kennels/Cages/Enclosures for dogs
    if any(k in name_upper for k in ['CUCHA', 'CASA PERRO', 'CASA PLASTICA', 'CASA PLÁSTICA',
                                       'IGLU', 'IGLÚ', 'CASITA PLASTICA', 'CASITA PLÁSTICA',
                                       'CASITA P/', 'CASITA PLAST', 'JAULA CERCADO',
                                       'BLACK DOG HOUSE', 'ECO DOG HOUSE',
                                       'CERCADO GALVANIZADO', 'CORRAL PERRO', 'PEN PERRO',
                                       'PUERTA MASCOTA', 'PUERTA PERRO']):
        return 'ACC-DES-CUC'

    # Scratchers/Cat trees
    if any(k in name_upper for k in ['RASCADOR', 'ARAÑADOR', 'ARANADOR',
                                       'TORRE GATO', 'GIMNASIO GATO', 'VESPER',
                                       'ARBOL RASCADOR', 'ÁRBOL RASCADOR']):
        return 'ACC-DES-RAS'

    # Interactive toys
    if any(k in name_upper for k in ['KONG', 'DISPENSER', 'PUZZLE', 'LICKS', 'INTERACTIVO']):
        return 'ACC-JUG-INT'

    # Cat toys / Enrichment
    if any(k in name_upper for k in ['RATON', 'RATÓN', 'PLUMA', 'CIRCUIT', 'SENSES 2.0',
                                       'TUNEL DE JUEGO', 'TÚNEL DE JUEGO',
                                       'CATNIP', 'ALMOHADA PARA GATO', 'VALERIAN']):
        return 'ACC-JUG-GAT'

    # Catit brand (cat accessories)
    if 'CATIT' in name_upper:
        if any(k in name_upper for k in ['FOUNTAIN', 'FUENTE']):
            return 'ACC-COM-GAT'
        if any(k in name_upper for k in ['DIGGER', 'FOOD TREE', 'SENSES']):
            return 'ACC-COM-GAT'
        if any(k in name_upper for k in ['SPINNER', 'CIRCUIT']):
            return 'ACC-JUG-GAT'
        if any(k in name_upper for k in ['VESPER', 'TOWER', 'ROCKET']):
            return 'ACC-DES-RAS'
        return 'ACC-JUG-GAT'

    # Chuckit brand (dog toys)
    if 'CHUCKIT' in name_upper:
        return 'ACC-JUG-PEL'

    # Trixie brand
    if 'TRIXIE' in name_upper:
        if any(k in name_upper for k in ['JUEGO', 'GAME', 'BOARD', 'PUZZLE', 'STRATEGY']):
            return 'ACC-JUG-INT'
        if any(k in name_upper for k in ['TUNNEL', 'TUNEL']):
            return 'ACC-JUG-GAT'
        if any(k in name_upper for k in ['CEPILLO', 'BRUSH', 'CORTAUNA', 'SCISSORS']):
            return 'ACC-HIG-CEP'
        if any(k in name_upper for k in ['CAMA', 'DONUT']):
            return 'ACC-DES-CAM'
        if any(k in name_upper for k in ['RASCADOR', 'ARBOL', 'ÁRBOL']):
            return 'ACC-DES-RAS'
        return 'ACC-JUG-PEL'

    # Zeedog brand
    if 'ZEEDOG' in name_upper:
        if any(k in name_upper for k in ['ARNES', 'ARNÉS', 'COLLAR', 'CORREA']):
            return 'ACC-PAS-COL'
        if 'BOLSA' in name_upper:
            return 'ACC-HIG-PAÑ'
        if 'BANDANA' in name_upper:
            return 'ACC-PAS-ROP'
        if 'CAMA' in name_upper:
            return 'ACC-DES-CAM'
        return 'ACC-PAS-COL'

    # Ferplast brand
    if 'FERPLAST' in name_upper:
        if any(k in name_upper for k in ['ARNES', 'ARNÉS', 'COLLAR', 'CORREA', 'AGILA']):
            return 'ACC-PAS-COL'
        if any(k in name_upper for k in ['CAMA', 'SIESTA', 'SLEEPER']):
            return 'ACC-DES-CAM'
        if 'COMEDERO' in name_upper or 'GLAM' in name_upper:
            return 'ACC-COM-PER'
        return 'ACC-PAS-COL'

    # General toys
    if any(k in name_upper for k in ['JUGUETE', 'PELOTA', 'CUERDA', 'MORDEDOR', 'TOY',
                                       'PELUCHE', 'BOLA ']):
        # Cat toys
        if is_cat_product or any(k in name_upper for k in ['SISAL', 'CATNIP', 'MATATABI']):
            return 'ACC-JUG-GAT'
        return 'ACC-JUG-PEL'

    # Feeders/Bowls/Food Storage
    if any(k in name_upper for k in ['COMEDERO', 'BEBEDERO', 'FUENTE AGUA', 'PLATO',
                                       'BOWL', 'ANTI HORMIGA', 'CANISTER', 'CONTENEDOR ALIMENTO',
                                       'DISPENSADOR ALIMENTO', 'PORTA BALANCEADO']):
        if is_cat_product:
            return 'ACC-COM-GAT'
        return 'ACC-COM-PER'

    # Feeder mats
    if 'ALFOMBRA' in name_upper or 'ZEEMAT' in name_upper:
        return 'ACC-COM-PER'

    # ===== EXOTIC ACCESSORIES =====
    # Bird cages and accessories
    if any(k in name_upper for k in ['JAULA ', 'NIDO P/', 'NIDO PARA', 'BAÑERA PARA PAJARO',
                                       'BAÑERA OVAL PARA PAJARO', 'PERCHAS']):
        return 'ACC-EXO-AVE'

    # Rodent/Cage accessories / Sand bath
    if any(k in name_upper for k in ['EXTENSOR DE REJILLA', 'KIT PORTON', 'RUEDA DE EJERCICIO',
                                       'ARENA DE BAÑO', 'ARENA ZOOBET', 'VIRUTA', 'HAMSTER']):
        return 'ACC-EXO-ROE'

    # ===== CLINICAL KITS/COMBOS =====
    if 'KIT DOSIFICADOR' in name_upper:
        return 'CLI-INS-AGU'
    if any(k in name_upper for k in ['COMBO CLINICO', 'COMBO CLÍNICO', 'BOTIQUIN', 'BOTIQUÍN',
                                       'COMBO SALUD']):
        return 'CLI-INS-QUI'

    # Medical applicators and tools
    if any(k in name_upper for k in ['APLICADOR COMPRIMIDO', 'APLICADOR DE PASTILLA',
                                       'PILL DISPENSER', 'PASTILLERO']):
        return 'ACC-HIG-DEN'  # Goes with dental/oral care tools

    # Generic insumos check (last resort for CLI-INS items without specific subcategory)
    if any(k in name_upper for k in ['INSUMOS HOSPITALARIOS', 'INSUMOS VETERINARIOS',
                                       'INSUMOS DE LABORATORIO', 'EQUIPOS DE LABORATORIO',
                                       'EQUIPOS HOSPITALARIOS', 'EQUIPOS VETERINARIOS']):
        # These are category headers, not actual products - skip
        return 'UNKNOWN'

    return 'UNKNOWN'


def analyze_file(filepath: Path) -> dict:
    """Analyze a single product file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    results = {
        'brand': data.get('brand_slug', 'unknown'),
        'total_products': 0,
        'categories': defaultdict(list)
    }

    for product in data.get('products', []):
        name = product.get('name', '')
        current_cat = product.get('category_slug', 'MISSING')
        suggested_cat = categorize_product(name, current_cat)
        variant_count = len(product.get('variants', [{}]))

        results['total_products'] += variant_count

        if current_cat != suggested_cat:
            results['categories'][f"{current_cat} -> {suggested_cat}"].append({
                'name': name[:60],
                'current': current_cat,
                'suggested': suggested_cat,
                'variants': variant_count
            })

    return results


def fix_file(filepath: Path) -> int:
    """Fix categories in a single product file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    fixed_count = 0
    for product in data.get('products', []):
        name = product.get('name', '')
        current_cat = product.get('category_slug', '')
        suggested_cat = categorize_product(name, current_cat)

        if suggested_cat != 'UNKNOWN' and current_cat != suggested_cat:
            product['category_slug'] = suggested_cat
            fixed_count += len(product.get('variants', [{}]))

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return fixed_count


def main():
    if len(sys.argv) < 2:
        print("Usage: python fix-categories.py [analyze|fix]")
        return

    command = sys.argv[1]

    if command == 'analyze':
        print("=" * 80)
        print("PRODUCT CATEGORIZATION ANALYSIS")
        print("=" * 80)

        all_changes = defaultdict(int)
        unknown_products = []

        for f in sorted(PRODUCTS_DIR.glob('products-*.json')):
            results = analyze_file(f)

            has_issues = False
            for change, products in results['categories'].items():
                if products:
                    has_issues = True
                    count = sum(p['variants'] for p in products)
                    all_changes[change] += count

                    for p in products:
                        if 'UNKNOWN' in change:
                            unknown_products.append(p['name'])

            if has_issues:
                print(f"\n{f.name} ({results['brand']})")
                for change, products in results['categories'].items():
                    if products:
                        count = sum(p['variants'] for p in products)
                        print(f"  {change}: {count} products")
                        for p in products[:2]:
                            print(f"    - {p['name']}")

        print("\n" + "=" * 80)
        print("SUMMARY OF CHANGES")
        print("=" * 80)
        for change, count in sorted(all_changes.items(), key=lambda x: -x[1]):
            print(f"  {change}: {count}")

        print(f"\n\nUNKNOWN PRODUCTS ({len(unknown_products)}):")
        for p in unknown_products[:20]:
            print(f"  - {p}")
        if len(unknown_products) > 20:
            print(f"  ... and {len(unknown_products) - 20} more")

    elif command == 'fix':
        print("=" * 80)
        print("FIXING PRODUCT CATEGORIES")
        print("=" * 80)

        total_fixed = 0
        for f in sorted(PRODUCTS_DIR.glob('products-*.json')):
            fixed = fix_file(f)
            if fixed > 0:
                print(f"  {f.name}: {fixed} products fixed")
                total_fixed += fixed

        print(f"\nTotal fixed: {total_fixed} products")


if __name__ == '__main__':
    main()
