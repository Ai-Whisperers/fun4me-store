/**
 * Google Sheets Inventory Template - Configuration
 * Centralized constants, colors, and sheet definitions
 */

// Default spreadsheet ID - can be overridden via environment
export const SPREADSHEET_ID =
  process.env.GSHEET_ID || '15hPrnWt0VcLAJkC2s2l-g5PLbM4Fe8e6KAsaSZUF6uk'

// Professional veterinary color palette
export const COLORS = {
  // Primary brand colors
  primary: { red: 0.157, green: 0.545, blue: 0.506 }, // #289082 - Teal
  primaryDark: { red: 0.118, green: 0.412, blue: 0.384 }, // #1E6962 - Dark teal
  primaryLight: { red: 0.878, green: 0.949, blue: 0.941 }, // #E0F2F0 - Light teal

  // Accent colors
  accent: { red: 0.984, green: 0.714, blue: 0.322 }, // #FBB652 - Amber
  accentLight: { red: 1, green: 0.953, blue: 0.878 }, // #FFF3E0 - Light amber

  // Status colors
  success: { red: 0.263, green: 0.627, blue: 0.278 }, // #43A047 - Green
  successLight: { red: 0.91, green: 0.961, blue: 0.914 }, // #E8F5E9 - Light green
  warning: { red: 0.976, green: 0.659, blue: 0.145 }, // #F9A825 - Yellow
  warningLight: { red: 1, green: 0.973, blue: 0.882 }, // #FFFDE1 - Light yellow
  error: { red: 0.898, green: 0.224, blue: 0.208 }, // #E53935 - Red
  errorLight: { red: 1, green: 0.922, blue: 0.933 }, // #FFEBEE - Light red

  // Neutral colors
  white: { red: 1, green: 1, blue: 1 },
  lightGray: { red: 0.969, green: 0.969, blue: 0.969 }, // #F7F7F7
  mediumGray: { red: 0.878, green: 0.878, blue: 0.878 }, // #E0E0E0
  darkGray: { red: 0.38, green: 0.38, blue: 0.38 }, // #616161
  black: { red: 0.129, green: 0.129, blue: 0.129 }, // #212121

  // Sheet-specific header colors
  guideHeader: { red: 0.157, green: 0.545, blue: 0.506 }, // Teal
  categoryHeader: { red: 0.282, green: 0.471, blue: 0.855 }, // Blue
  providerHeader: { red: 0.608, green: 0.349, blue: 0.714 }, // Purple
  brandHeader: { red: 0.937, green: 0.325, blue: 0.314 }, // Coral
  productHeader: { red: 0.157, green: 0.545, blue: 0.506 }, // Teal
  stockHeader: { red: 0.984, green: 0.549, blue: 0.235 }, // Orange
  configHeader: { red: 0.475, green: 0.333, blue: 0.282 }, // Brown
  quickHeader: { red: 0.263, green: 0.627, blue: 0.278 }, // Green

  // For conditional formatting
  lightBlue: { red: 0.929, green: 0.949, blue: 0.969 },
} as const

// Sheet definitions with all metadata
export interface SheetConfig {
  name: string
  headerColor: (typeof COLORS)[keyof typeof COLORS]
  columns: string[]
  dataRows: number
  frozenRows?: number
  frozenCols?: number
}

export const SHEETS: SheetConfig[] = [
  {
    name: '📖 Guía Rápida',
    headerColor: COLORS.guideHeader,
    columns: ['', '', '', '', '', '', '', ''], // 8 columns for full-width documentation layout
    dataRows: 220, // Comprehensive guide with 6 sections
    frozenRows: 0,
  },
  {
    // CATEGORÍAS: Árbol jerárquico de productos
    // Read-only reference data loaded from JSON
    name: '📂 Categorías',
    headerColor: COLORS.categoryHeader,
    columns: [
      'Código', // A - Hierarchical code (NUT-CAN-SEC)
      'Código Padre', // B - Parent code
      '📊 Nivel', // C - Hierarchy level (formula)
      'Nombre', // D - Category name
      'Descripción', // E - Description
      'Ejemplos', // F - Example products
      '📦 Categoría #', // G - Direct count from products (formula)
      '📦 Subcategoría #', // H - Sum of children's totals (formula)
      '📦 # Productos', // I - Total = Category + Subcategory (formula)
      'Activo', // J - Active status
    ],
    dataRows: 100,
    frozenRows: 1,
    frozenCols: 1,
  },
  {
    // PROVEEDORES: B2B supplier information
    name: '🏭 Proveedores',
    headerColor: COLORS.providerHeader,
    columns: [
      '🔒 Código', // A - Auto-generated
      'Nombre', // B - Commercial name
      'Razón Social', // C - Legal name
      'RUC', // D - Tax ID
      'Tipo', // E - products/services/both
      '⭐ Calificación', // F - Rating 1-5
      'Teléfono', // G - Main phone (clickable)
      'WhatsApp', // H - WhatsApp number
      'Email', // I - Main email
      'Sitio Web', // J - Website
      'Dirección', // K - Full address
      'Ciudad', // L - City
      'Persona Contacto', // M - Contact person
      'Cargo Contacto', // N - Contact position
      'Pedido Mín. (Gs)', // O - Minimum order
      'Condiciones Pago', // P - Payment terms
      'Días Entrega', // Q - Delivery days
      'Marcas', // R - Brands distributed
      '📦 # Productos', // S - Products count (formula)
      '💰 Total Compras', // T - Total purchases (formula)
      'Última Compra', // U - Last purchase date (formula)
      'Verificado', // V - Verification status
      'Notas', // W - Notes
      'Activo', // X - Active status
    ],
    dataRows: 100,
    frozenRows: 1,
    frozenCols: 2,
  },
  {
    // MARCAS: Brand information
    name: '🏷️ Marcas',
    headerColor: COLORS.brandHeader,
    columns: [
      '🔒 Código', // A - Auto-generated
      'Nombre', // B - Brand name
      'Tipo', // C - Category type
      'Segmento', // D - Market segment
      'País', // E - Country origin
      'Empresa Matriz', // F - Parent company
      'Fundación', // G - Founded year
      'Especialidades', // H - Specialties
      'Solo Veterinaria', // I - Vet exclusive
      'Distribuidor', // J - Local distributor
      'Sitio Web', // K - Website
      'Productos Clave', // L - Key products
      '📦 # Productos', // M - Products count (formula)
      'Descripción', // N - Description
      'Activo', // O - Active status
    ],
    dataRows: 150,
    frozenRows: 1,
    frozenCols: 2,
  },
  {
    // CATÁLOGO MASTER: All available products in the market
    name: '🆕 Productos',
    headerColor: COLORS.productHeader,
    columns: [
      '🔒 SKU', // A - Auto-generated
      'Nombre', // B - Product name
      'Categoría', // C - Category code
      'Marca', // D - Brand name
      'Unid. Compra', // E - Purchase unit
      'Cant. Contenida', // F - Units per package
      'Unid. Venta', // G - Sale unit
      'Precio Compra', // H - Purchase price
      '💹 Costo Unit.', // I - Unit cost (formula)
      'Proveedor', // J - Supplier
      'Especies', // K - Target species
      'Receta', // L - Requires prescription
      '✓ En Stock', // M - In clinic catalog (formula)
      'Descripción', // N - Description
      'Activo', // O - Active status
    ],
    dataRows: 1200,
    frozenRows: 1,
    frozenCols: 2,
  },
  {
    // PRODUCTOS DE LA CLÍNICA: Clinic's selected products with real-time stock
    // Client enters: Producto, Precio Venta, Stock Mín, Ubicación (4 columns)
    // Everything else is auto-filled or calculated
    name: '📋 Mis Productos',
    headerColor: COLORS.quickHeader,
    columns: [
      // === CLIENT ENTERS (5 cols) ===
      'Producto', // A - Product name (dropdown from catalog)
      'Precio Venta', // B - Sale price (client sets)
      'Stock Mín.', // C - Minimum stock (client sets)
      'Ubicación', // D - Storage location (client sets)
      'Activo', // E - Active status (Sí/No)
      // === AUTO-FILL FROM CATALOG (7 cols) ===
      '🔒 Código', // F - SKU (formula: VLOOKUP from catalog)
      '📝 Descripción', // G - Description (formula: VLOOKUP)
      '📂 Categoría', // H - Category (formula: VLOOKUP)
      '🏷️ Marca', // I - Brand (formula: VLOOKUP)
      '🏭 Proveedor', // J - Supplier (formula: VLOOKUP)
      '📊 Código Barras', // K - Barcode (user can fill)
      '💊 Receta', // L - Requires Rx (formula: VLOOKUP)
      // === AUTO-CALCULATED (7 cols) ===
      '💰 Últ.Costo', // M - Last cost (formula from movements)
      '📊 Margen %', // N - Margin (formula - number format)
      '📦 Stock', // O - Current stock (formula from movements)
      '💵 Valor', // P - Stock value (formula)
      '🚦 Estado', // Q - Status text with emoji (formula)
      '📅 Próx.Vence', // R - Next expiration (formula from movements)
      '⚠️ Alertas', // S - Alerts (formula: expired, low stock, etc.)
    ],
    dataRows: 500,
    frozenRows: 1,
    frozenCols: 1,
  },
  {
    // MOVIMIENTOS DE STOCK: Complete transaction log with location tracking
    // Client enters: Fecha, Producto, Operación, Cantidad, Lote, Ubicación, Responsable (7 cols)
    // For Compra only: Costo Unit., Vencimiento, Documento (3 cols)
    name: '📦 Movimientos Stock',
    headerColor: COLORS.stockHeader,
    columns: [
      // === CLIENT ENTERS (10 cols) ===
      'Fecha', // A - Movement date
      'Producto', // B - Product name (dropdown from Mis Productos)
      'Operación', // C - Operation type (determines +/-)
      'Cantidad', // D - Quantity (always positive)
      'Lote', // E - Batch/Lot number (required for Compra)
      'Ubicación', // F - Storage location (dropdown)
      'Responsable', // G - Person responsible (dropdown)
      'Costo Unit.', // H - Unit cost (required for Compra only)
      'Vencimiento', // I - Expiration (required for Compra + Lote)
      'Documento', // J - Invoice/ticket reference (FAC-xxx, TKT-xxx)
      // === AUTO-CALCULATED (5 cols) ===
      '🔒 #', // K - Auto-increment ID (formula)
      '🔒 Código', // L - Product code (formula: VLOOKUP)
      '🔒 Costo Usado', // M - Cost used (formula: for non-Compra, uses last cost)
      '🔒 +/-', // N - Sign based on operation (formula)
      '💰 Total', // O - Total cost (formula: Cantidad × Costo × sign)
    ],
    dataRows: 1000,
    frozenRows: 1,
    frozenCols: 2,
  },
  {
    // CONTROL DE LOTES: Auto-generated lot tracking view
    // 100% formula-based - no data entry
    // Note: Columns A+B are populated by UNIQUE array formula (Product, Lote)
    name: '📊 Control Lotes',
    headerColor: COLORS.accent,
    columns: [
      'Producto', // A - Product name (from UNIQUE array)
      'Lote', // B - Lot number (from UNIQUE array)
      '🔒 Código', // C - Product code (formula)
      '📅 F.Ingreso', // D - First purchase date (formula)
      '📅 Vencimiento', // E - Expiration date (formula)
      '📦 Cantidad', // F - Remaining quantity (formula: entries - exits)
      '💰 Costo Unit.', // G - Unit cost (formula)
      '💵 Valor', // H - Value (formula)
      '⏳ Días Vence', // I - Days until expiration (formula)
      '🚦 Estado', // J - Status: OK, Por vencer, Vencido, Agotado (formula)
      '📋 Orden FIFO', // K - Pick order (1 = use first, FEFO priority)
    ],
    dataRows: 1000,
    frozenRows: 1,
    frozenCols: 2,
  },
  {
    // CONFIGURACIÓN: Side-by-side tables for Ubicaciones (A-D) and Responsables (F-I)
    // Column E is empty separator between the two tables
    name: '⚙️ Configuración',
    headerColor: COLORS.configHeader,
    columns: [
      // Ubicaciones table (A-D)
      'Código',
      'Ubicación',
      'Descripción',
      'Activo',
      // Separator (E)
      '',
      // Responsables table (F-I)
      'ID',
      'Responsable',
      'Rol/Cargo',
      'Activo',
    ],
    dataRows: 50,
    frozenRows: 1,
  },
  {
    // HOJA AUXILIAR: Filtered lists for dropdowns
    name: '🔧 Datos',
    headerColor: COLORS.darkGray,
    columns: [
      'Categorías',
      'Marcas',
      'Proveedores',
      'Productos Catálogo',
      'Mis Productos',
      'Ubicaciones',
      'Responsables',
    ],
    dataRows: 1200,
    frozenRows: 1,
  },
]

// Stock operation types with colors and sign
// sign: 1 = entrada (+), -1 = salida (-)
export const STOCK_OPERATIONS = [
  // ENTRADAS (+)
  { value: 'Compra', sign: 1, color: COLORS.successLight },
  { value: 'Devolución Cliente', sign: 1, color: COLORS.successLight },
  { value: 'Ajuste +', sign: 1, color: COLORS.warningLight },
  { value: 'Hallazgo', sign: 1, color: COLORS.successLight },
  // SALIDAS (-)
  { value: 'Venta', sign: -1, color: COLORS.errorLight },
  { value: 'Uso Interno', sign: -1, color: COLORS.lightBlue },
  { value: 'Devolución Proveedor', sign: -1, color: COLORS.errorLight },
  { value: 'Ajuste -', sign: -1, color: COLORS.warningLight },
  { value: 'Daño', sign: -1, color: COLORS.errorLight },
  { value: 'Vencido', sign: -1, color: COLORS.errorLight },
] as const

// Common dropdown options
export const DROPDOWN_OPTIONS = {
  yesNo: ['Sí', 'No'],

  // Category levels (1 = top, 2 = sub, 3 = detail, 4 = granular, 5 = micro)
  levels: ['1', '2', '3', '4', '5'],

  // Supplier types (must match CHECK constraint in suppliers.supplier_type)
  providerTypes: ['Productos', 'Servicios', 'Ambos'],

  // Supplier rating (1-5 stars)
  ratings: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'],

  // Brand types
  brandTypes: [
    'Alimentos',
    'Farmacia',
    'Accesorios',
    'Higiene',
    'Equipos',
    'Consumibles',
    'Suplementos',
  ],

  // Market segments
  marketSegments: [
    'Económico',
    'Estándar',
    'Premium',
    'Super Premium',
    'Veterinario',
    'Profesional',
  ],

  // Unidades de COMPRA (cómo llega la factura del proveedor)
  unitsBuy: [
    'Unidad',
    'Caja',
    'Pack',
    'Bolsa',
    'Frasco',
    'Bulto',
    'Display',
    'Blister',
    'Paquete',
    'Kg',
    'L',
  ],

  // Unidades de VENTA (cómo se vende al cliente)
  unitsSell: [
    'Unidad',
    'Tableta',
    'Ampolla',
    'Cápsula',
    'Comprimido',
    'ml',
    'g',
    'Kg',
    'Dosis',
    'Aplicación',
    'Bolsa',
    'Frasco',
    'Caja',
    'Sobre',
    'Pipeta',
  ],

  // Species for product targeting
  species: [
    'Perro',
    'Gato',
    'Perro y Gato',
    'Aves',
    'Roedores',
    'Reptiles',
    'Equinos',
    'Bovinos',
    'Porcinos',
    'Todos',
  ],

  // Payment terms for suppliers
  paymentTerms: ['Contado', '15 días', '30 días', '60 días', '90 días'],

  // Stock operations (match STOCK_OPERATIONS)
  operations: STOCK_OPERATIONS.map((op) => op.value),

  // Verification status
  verificationStatus: ['Verificado', 'Pendiente', 'No verificado'],
} as const

// Helper to get sheet by name
export function getSheetConfig(name: string): SheetConfig | undefined {
  return SHEETS.find((s) => s.name === name)
}
