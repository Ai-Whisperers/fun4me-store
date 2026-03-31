#!/usr/bin/env node

/**
 * Domain/CNAME Management CLI
 *
 * Manages domain configurations for the multi-tenant Vete platform.
 * Supports Vercel deployments, Cloudflare tunnels, and self-hosted setups.
 *
 * Usage:
 *   node scripts/domains.mjs <command> [options]
 *
 * Commands:
 *   list                          List all domains or filter by tenant/status
 *   add <domain> <tenant>         Add a new domain mapping
 *   remove <domain>               Remove a domain mapping
 *   validate                      Validate domains.json schema and references
 *   verify <domain>               Verify DNS configuration for a domain
 *   sync-vercel                   Sync domains with Vercel API
 *   generate-cloudflare           Generate Cloudflare tunnel config
 *
 * Options:
 *   --tenant <slug>               Filter by tenant slug
 *   --status <status>             Filter by status (pending|active|verifying|failed)
 *   --type <type>                 Domain type (primary|subdomain|redirect|tunnel)
 *   --provider <provider>         Provider (vercel|cloudflare|selfhosted)
 *   --json                        Output as JSON
 *   --force                       Skip confirmation prompts
 *   --dry-run                     Preview changes without applying
 *   --tunnel <name>               Tunnel name for Cloudflare config generation
 *   --output <path>               Output path for generated files
 *
 * Exit codes:
 *   0 - Success
 *   1 - Operation/validation error
 *   2 - Configuration error
 *
 * @author Vete Platform
 * @version 1.0.0
 */

import fs from 'fs'
import path from 'path'
import dns from 'dns/promises'
import readline from 'readline'
import { fileURLToPath } from 'url'

// ============================================================================
// CONFIGURATION
// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const WEB_DIR = path.join(ROOT_DIR, 'web')
const DOMAINS_FILE = path.join(WEB_DIR, '.content_data', 'domains.json')
const CONTENT_DATA_DIR = path.join(WEB_DIR, '.content_data')
const CLOUDFLARED_DIR = path.join(ROOT_DIR, 'cloudflared')

// Vercel DNS targets
const VERCEL_CNAME_TARGET = 'cname.vercel-dns.com'
const VERCEL_A_RECORD = '76.76.21.21'

// ============================================================================
// ANSI COLORS
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logError(message) {
  console.error(`${colors.red}Error: ${message}${colors.reset}`)
}

function logSuccess(message) {
  console.log(`${colors.green}${message}${colors.reset}`)
}

function logWarn(message) {
  console.log(`${colors.yellow}Warning: ${message}${colors.reset}`)
}

function logInfo(message) {
  console.log(`${colors.cyan}${message}${colors.reset}`)
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

function loadDomains() {
  try {
    const content = fs.readFileSync(DOMAINS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    if (error.code === 'ENOENT') {
      logError(`Domains file not found: ${DOMAINS_FILE}`)
      logInfo('Run: node scripts/domains.mjs init')
      process.exit(2)
    }
    logError(`Failed to parse domains.json: ${error.message}`)
    process.exit(2)
  }
}

function saveDomains(config) {
  try {
    const content = JSON.stringify(config, null, 2) + '\n'
    fs.writeFileSync(DOMAINS_FILE, content, 'utf-8')
    return true
  } catch (error) {
    logError(`Failed to save domains.json: ${error.message}`)
    return false
  }
}

function getTenants() {
  try {
    const entries = fs.readdirSync(CONTENT_DATA_DIR, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory())
      .filter(entry => !entry.name.startsWith('_') && !entry.name.startsWith('.'))
      .filter(entry => {
        const configPath = path.join(CONTENT_DATA_DIR, entry.name, 'config.json')
        return fs.existsSync(configPath)
      })
      .map(entry => entry.name)
  } catch (error) {
    logError(`Failed to read tenants: ${error.message}`)
    return []
  }
}

// ============================================================================
// USER INPUT
// ============================================================================

async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${message} (y/N): ${colors.reset}`, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

function parseArgs(args) {
  const result = {
    command: null,
    positional: [],
    flags: {},
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const nextArg = args[i + 1]

      if (nextArg && !nextArg.startsWith('--')) {
        result.flags[key] = nextArg
        i += 2
      } else {
        result.flags[key] = true
        i += 1
      }
    } else if (!result.command) {
      result.command = arg
      i += 1
    } else {
      result.positional.push(arg)
      i += 1
    }
  }

  return result
}

// ============================================================================
// COMMANDS
// ============================================================================

/**
 * List all domains with optional filtering
 */
function cmdList(args) {
  const config = loadDomains()
  let domains = config.domains

  // Apply filters
  if (args.flags.tenant) {
    domains = domains.filter(d => d.tenant === args.flags.tenant)
  }
  if (args.flags.status) {
    domains = domains.filter(d => d.status === args.flags.status)
  }
  if (args.flags.type) {
    domains = domains.filter(d => d.type === args.flags.type)
  }
  if (args.flags.provider) {
    domains = domains.filter(d => d.provider === args.flags.provider)
  }

  // JSON output
  if (args.flags.json) {
    console.log(JSON.stringify(domains, null, 2))
    return
  }

  // Table output
  log('\n  Domain Management - Vete Platform', 'cyan')
  log('  ' + '='.repeat(60), 'cyan')
  log(`\n  Default Domain: ${colors.bold}${config.defaultDomain}${colors.reset}`)
  log(`  Total Domains: ${domains.length}\n`)

  if (domains.length === 0) {
    logWarn('  No domains found matching criteria')
    return
  }

  // Table header
  const header = [
    'Domain'.padEnd(35),
    'Tenant'.padEnd(15),
    'Type'.padEnd(12),
    'Status'.padEnd(10),
    'Provider'.padEnd(12),
  ].join(' ')

  log(`  ${colors.dim}${header}${colors.reset}`)
  log(`  ${colors.dim}${'-'.repeat(84)}${colors.reset}`)

  // Table rows
  for (const domain of domains) {
    const statusColor = {
      active: 'green',
      pending: 'yellow',
      verifying: 'blue',
      failed: 'red',
    }[domain.status] || 'reset'

    const row = [
      domain.domain.padEnd(35),
      domain.tenant.padEnd(15),
      domain.type.padEnd(12),
      `${colors[statusColor]}${domain.status.padEnd(10)}${colors.reset}`,
      (domain.provider || 'n/a').padEnd(12),
    ].join(' ')

    log(`  ${row}`)
  }

  log('')
}

/**
 * Add a new domain mapping
 */
async function cmdAdd(args) {
  const [domain, tenant] = args.positional

  if (!domain || !tenant) {
    logError('Usage: node scripts/domains.mjs add <domain> <tenant>')
    logInfo('Example: node scripts/domains.mjs add terrapet.com.py adris --type primary')
    process.exit(1)
  }

  // Validate domain format
  const domainRegex = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i
  if (!domainRegex.test(domain)) {
    logError(`Invalid domain format: ${domain}`)
    process.exit(1)
  }

  // Validate tenant exists
  const tenants = getTenants()
  if (!tenants.includes(tenant)) {
    logError(`Tenant not found: ${tenant}`)
    logInfo(`Available tenants: ${tenants.join(', ')}`)
    process.exit(1)
  }

  const config = loadDomains()

  // Check for duplicates
  if (config.domains.find(d => d.domain.toLowerCase() === domain.toLowerCase())) {
    logError(`Domain already exists: ${domain}`)
    process.exit(1)
  }

  // Build new entry
  const newEntry = {
    domain: domain.toLowerCase(),
    tenant,
    type: args.flags.type || 'primary',
    provider: args.flags.provider || 'vercel',
    ssl: {
      enabled: true,
      autoRenew: true,
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  // Add DNS records hint based on provider
  if (newEntry.provider === 'vercel') {
    newEntry.dnsRecords = {
      type: domain.startsWith('www.') ? 'CNAME' : 'A',
      name: domain.startsWith('www.') ? 'www' : '@',
      value: domain.startsWith('www.') ? VERCEL_CNAME_TARGET : VERCEL_A_RECORD,
    }
  }

  // Handle redirect type
  if (newEntry.type === 'redirect' && args.flags.redirect) {
    newEntry.redirectTo = args.flags.redirect
  }

  // Confirmation
  log('\n  New domain entry:', 'cyan')
  log(`    Domain:   ${newEntry.domain}`)
  log(`    Tenant:   ${newEntry.tenant}`)
  log(`    Type:     ${newEntry.type}`)
  log(`    Provider: ${newEntry.provider}`)
  log(`    Status:   ${newEntry.status}`)
  log('')

  if (!args.flags.force) {
    const confirmed = await confirm('Add this domain?')
    if (!confirmed) {
      log('Cancelled.', 'gray')
      process.exit(0)
    }
  }

  config.domains.push(newEntry)
  config.domains.sort((a, b) => a.domain.localeCompare(b.domain))

  if (saveDomains(config)) {
    logSuccess(`\n  Domain added: ${domain}`)
    log('')

    if (newEntry.dnsRecords) {
      logInfo('  Required DNS configuration:')
      log(`    Type:  ${newEntry.dnsRecords.type}`)
      log(`    Name:  ${newEntry.dnsRecords.name}`)
      log(`    Value: ${newEntry.dnsRecords.value}`)
      log('')
      logInfo('  After configuring DNS, run:')
      log(`    node scripts/domains.mjs verify ${domain}`)
      log('')
    }
  }
}

/**
 * Remove a domain mapping
 */
async function cmdRemove(args) {
  const [domain] = args.positional

  if (!domain) {
    logError('Usage: node scripts/domains.mjs remove <domain>')
    process.exit(1)
  }

  const config = loadDomains()
  const index = config.domains.findIndex(d => d.domain.toLowerCase() === domain.toLowerCase())

  if (index === -1) {
    logError(`Domain not found: ${domain}`)
    process.exit(1)
  }

  const entry = config.domains[index]

  log('\n  Domain to remove:', 'yellow')
  log(`    Domain:   ${entry.domain}`)
  log(`    Tenant:   ${entry.tenant}`)
  log(`    Type:     ${entry.type}`)
  log(`    Status:   ${entry.status}`)
  log('')

  if (!args.flags.force) {
    const confirmed = await confirm('Remove this domain?')
    if (!confirmed) {
      log('Cancelled.', 'gray')
      process.exit(0)
    }
  }

  config.domains.splice(index, 1)

  if (saveDomains(config)) {
    logSuccess(`\n  Domain removed: ${domain}`)
    log('')
  }
}

/**
 * Validate domains.json schema and references
 */
function cmdValidate() {
  log('\n  Validating domains configuration...', 'cyan')
  log('  ' + '='.repeat(50), 'cyan')

  const config = loadDomains()
  const tenants = getTenants()
  const errors = []
  const warnings = []

  // Check version
  if (!config.version) {
    errors.push('Missing "version" field')
  }

  // Check default domain
  if (!config.defaultDomain) {
    errors.push('Missing "defaultDomain" field')
  }

  // Validate each domain
  const seenDomains = new Set()

  for (const entry of config.domains) {
    const prefix = `[${entry.domain}]`

    // Check required fields
    if (!entry.domain) {
      errors.push(`${prefix} Missing domain field`)
    }
    if (!entry.tenant) {
      errors.push(`${prefix} Missing tenant field`)
    }
    if (!entry.type) {
      errors.push(`${prefix} Missing type field`)
    }
    if (!entry.status) {
      errors.push(`${prefix} Missing status field`)
    }

    // Check tenant exists
    if (entry.tenant && !tenants.includes(entry.tenant)) {
      errors.push(`${prefix} Tenant not found: ${entry.tenant}`)
    }

    // Check for duplicates
    if (seenDomains.has(entry.domain?.toLowerCase())) {
      errors.push(`${prefix} Duplicate domain entry`)
    }
    seenDomains.add(entry.domain?.toLowerCase())

    // Check valid type
    const validTypes = ['primary', 'subdomain', 'redirect', 'tunnel']
    if (entry.type && !validTypes.includes(entry.type)) {
      errors.push(`${prefix} Invalid type: ${entry.type}`)
    }

    // Check valid status
    const validStatuses = ['pending', 'active', 'verifying', 'failed']
    if (entry.status && !validStatuses.includes(entry.status)) {
      errors.push(`${prefix} Invalid status: ${entry.status}`)
    }

    // Check redirect has target
    if (entry.type === 'redirect' && !entry.redirectTo) {
      warnings.push(`${prefix} Redirect type without redirectTo`)
    }

    // Check tunnel has tunnelId
    if (entry.type === 'tunnel' && !entry.cloudflare?.tunnelId) {
      warnings.push(`${prefix} Tunnel type without cloudflare.tunnelId`)
    }
  }

  // Output results
  log('')

  if (errors.length > 0) {
    log('  Errors:', 'red')
    for (const error of errors) {
      log(`    - ${error}`, 'red')
    }
  }

  if (warnings.length > 0) {
    log('  Warnings:', 'yellow')
    for (const warning of warnings) {
      log(`    - ${warning}`, 'yellow')
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    logSuccess('  All validations passed!')
  }

  log('')
  log(`  Summary: ${errors.length} errors, ${warnings.length} warnings`, errors.length > 0 ? 'red' : 'green')
  log('')

  process.exit(errors.length > 0 ? 1 : 0)
}

/**
 * Verify DNS configuration for a domain
 */
async function cmdVerify(args) {
  const [domain] = args.positional

  if (!domain) {
    logError('Usage: node scripts/domains.mjs verify <domain>')
    process.exit(1)
  }

  const config = loadDomains()
  const entry = config.domains.find(d => d.domain.toLowerCase() === domain.toLowerCase())

  log(`\n  Verifying DNS for: ${domain}`, 'cyan')
  log('  ' + '='.repeat(50), 'cyan')

  let hasErrors = false

  // Check A records
  try {
    const aRecords = await dns.resolve4(domain)
    log(`\n  A Records:`, 'green')
    for (const record of aRecords) {
      const isVercel = record === VERCEL_A_RECORD
      log(`    ${record} ${isVercel ? colors.green + '(Vercel)' + colors.reset : ''}`)
    }
  } catch (error) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
      log(`\n  A Records: ${colors.gray}None${colors.reset}`)
    } else {
      log(`\n  A Records: ${colors.red}Error - ${error.code}${colors.reset}`)
      hasErrors = true
    }
  }

  // Check CNAME records
  try {
    const cnameRecords = await dns.resolveCname(domain)
    log(`\n  CNAME Records:`, 'green')
    for (const record of cnameRecords) {
      const isVercel = record.includes('vercel')
      log(`    ${record} ${isVercel ? colors.green + '(Vercel)' + colors.reset : ''}`)
    }
  } catch (error) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
      log(`\n  CNAME Records: ${colors.gray}None${colors.reset}`)
    } else {
      log(`\n  CNAME Records: ${colors.red}Error - ${error.code}${colors.reset}`)
    }
  }

  // Check TXT records (for verification)
  try {
    const txtRecords = await dns.resolveTxt(domain)
    if (txtRecords.length > 0) {
      log(`\n  TXT Records:`, 'green')
      for (const record of txtRecords) {
        log(`    ${record.join('')}`)
      }
    }
  } catch {
    // TXT records are optional
  }

  // Update status if we have an entry
  if (entry && !hasErrors) {
    const wasUpdated = entry.status !== 'active'
    entry.status = 'active'
    entry.verifiedAt = new Date().toISOString()
    entry.updatedAt = new Date().toISOString()

    if (wasUpdated) {
      saveDomains(config)
      logSuccess('\n  Status updated to: active')
    }
  }

  log('')
}

/**
 * Sync domains with Vercel API
 */
async function cmdSyncVercel(args) {
  const token = args.flags.token || process.env.VERCEL_TOKEN
  const projectId = args.flags.project || process.env.VERCEL_PROJECT_ID
  const dryRun = args.flags['dry-run']

  if (!token) {
    logError('VERCEL_TOKEN not set')
    logInfo('Set via: export VERCEL_TOKEN=<your-token>')
    logInfo('Get token: https://vercel.com/account/tokens')
    process.exit(2)
  }

  if (!projectId) {
    logError('VERCEL_PROJECT_ID not set')
    logInfo('Set via: export VERCEL_PROJECT_ID=<your-project-id>')
    logInfo('Find in: Vercel Dashboard > Project > Settings > General')
    process.exit(2)
  }

  log('\n  Syncing domains with Vercel...', 'cyan')
  log('  ' + '='.repeat(50), 'cyan')

  if (dryRun) {
    logWarn('  DRY RUN - No changes will be made')
  }

  const config = loadDomains()
  const vercelDomains = config.domains.filter(d =>
    d.provider === 'vercel' && d.type !== 'redirect' && d.status !== 'failed'
  )

  log(`\n  Found ${vercelDomains.length} Vercel domain(s) to sync\n`)

  for (const domain of vercelDomains) {
    if (dryRun) {
      log(`  [DRY-RUN] Would add: ${domain.domain}`, 'yellow')
      continue
    }

    try {
      const response = await fetch(
        `https://api.vercel.com/v10/projects/${projectId}/domains`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: domain.domain }),
        }
      )

      if (response.ok) {
        logSuccess(`  Added: ${domain.domain}`)

        // Update status
        domain.status = 'verifying'
        domain.updatedAt = new Date().toISOString()
      } else {
        const error = await response.json()
        if (error.error?.code === 'domain_already_in_use') {
          log(`  ${colors.gray}Already configured: ${domain.domain}${colors.reset}`)
        } else {
          logError(`  Failed: ${domain.domain} - ${error.error?.message || 'Unknown error'}`)
          domain.status = 'failed'
          domain.updatedAt = new Date().toISOString()
        }
      }
    } catch (error) {
      logError(`  Error: ${domain.domain} - ${error.message}`)
    }
  }

  if (!dryRun) {
    saveDomains(config)
  }

  log('')
}

/**
 * Generate Cloudflare tunnel configuration
 */
function cmdGenerateCloudflare(args) {
  const tunnelName = args.flags.tunnel || 'vete-tunnel'
  const outputPath = args.flags.output || path.join(CLOUDFLARED_DIR, 'config.yml')

  log('\n  Generating Cloudflare tunnel config...', 'cyan')
  log('  ' + '='.repeat(50), 'cyan')

  const config = loadDomains()

  // Find tunnel or create placeholder
  const tunnel = config.cloudflare?.tunnels?.find(t => t.name === tunnelName)
  const tunnelId = tunnel?.id || '<TUNNEL_UUID>'

  if (!tunnel) {
    logWarn(`  Tunnel "${tunnelName}" not registered. Using placeholder UUID.`)
    logInfo('  After creating the tunnel, update domains.json with the actual UUID.')
    log('')
  }

  // Get domains for tunnel (either tunnel type or all selfhosted)
  const tunnelDomains = config.domains.filter(d =>
    d.type === 'tunnel' || d.provider === 'selfhosted'
  )

  if (tunnelDomains.length === 0) {
    logWarn('  No tunnel or selfhosted domains found.')
    logInfo('  Add domains with: node scripts/domains.mjs add <domain> <tenant> --type tunnel')
    process.exit(0)
  }

  // Build YAML config
  const ingress = tunnelDomains.map(d => ({
    hostname: d.domain,
    service: 'http://localhost:3000',
  }))

  // Add catch-all
  ingress.push({ service: 'http_status:404' })

  const yamlLines = [
    '# Cloudflare Tunnel Configuration',
    '# Generated by: node scripts/domains.mjs generate-cloudflare',
    `# Generated at: ${new Date().toISOString()}`,
    '#',
    '# Setup:',
    '#   1. cloudflared tunnel create vete-tunnel',
    '#   2. Update domains.json with tunnel UUID',
    '#   3. cloudflared tunnel run vete-tunnel',
    '#',
    '',
    `tunnel: ${tunnelId}`,
    `credentials-file: /etc/cloudflared/${tunnelId}.json`,
    '',
    'ingress:',
  ]

  for (const entry of ingress) {
    if (entry.hostname) {
      yamlLines.push(`  - hostname: ${entry.hostname}`)
      yamlLines.push(`    service: ${entry.service}`)
    } else {
      yamlLines.push(`  - service: ${entry.service}`)
    }
  }

  const yamlContent = yamlLines.join('\n') + '\n'

  // Ensure directory exists
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, yamlContent, 'utf-8')

  logSuccess(`\n  Config written to: ${outputPath}`)
  log('')
  log('  Domains included:', 'cyan')
  for (const d of tunnelDomains) {
    log(`    - ${d.domain} -> ${d.tenant}`)
  }
  log('')
  logInfo('  Next steps:')
  log('    1. Create tunnel: cloudflared tunnel create vete-tunnel')
  log('    2. Run tunnel: cloudflared tunnel run vete-tunnel')
  log('    3. Configure DNS: CNAME to <tunnel-id>.cfargotunnel.com')
  log('')
}

/**
 * Show help
 */
function cmdHelp() {
  log(`
  ${colors.cyan}${colors.bold}Domain Management CLI - Vete Platform${colors.reset}

  ${colors.bold}USAGE${colors.reset}
    node scripts/domains.mjs <command> [options]

  ${colors.bold}COMMANDS${colors.reset}
    list                            List all domains
    add <domain> <tenant>           Add a new domain mapping
    remove <domain>                 Remove a domain mapping
    validate                        Validate configuration
    verify <domain>                 Verify DNS for a domain
    sync-vercel                     Sync with Vercel API
    generate-cloudflare             Generate tunnel config

  ${colors.bold}OPTIONS${colors.reset}
    --tenant <slug>                 Filter by tenant
    --status <status>               Filter by status
    --type <type>                   Domain type (primary|subdomain|redirect|tunnel)
    --provider <provider>           Provider (vercel|cloudflare|selfhosted)
    --json                          Output as JSON
    --force                         Skip confirmations
    --dry-run                       Preview without changes
    --tunnel <name>                 Tunnel name for Cloudflare
    --output <path>                 Output path for generated files

  ${colors.bold}EXAMPLES${colors.reset}
    ${colors.dim}# List all domains${colors.reset}
    node scripts/domains.mjs list

    ${colors.dim}# Add a custom domain${colors.reset}
    node scripts/domains.mjs add terrapet.com.py adris --type primary

    ${colors.dim}# Verify DNS configuration${colors.reset}
    node scripts/domains.mjs verify terrapet.com.py

    ${colors.dim}# Sync with Vercel${colors.reset}
    VERCEL_TOKEN=xxx VERCEL_PROJECT_ID=yyy node scripts/domains.mjs sync-vercel

    ${colors.dim}# Generate Cloudflare tunnel config${colors.reset}
    node scripts/domains.mjs generate-cloudflare --tunnel vete-tunnel

  ${colors.bold}ENVIRONMENT VARIABLES${colors.reset}
    VERCEL_TOKEN                    Vercel API token
    VERCEL_PROJECT_ID               Vercel project ID
    CLOUDFLARE_API_TOKEN            Cloudflare API token
    CLOUDFLARE_ACCOUNT_ID           Cloudflare account ID
`)
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.command || args.command === 'help' || args.flags.help) {
    cmdHelp()
    process.exit(0)
  }

  const commands = {
    list: cmdList,
    add: cmdAdd,
    remove: cmdRemove,
    validate: cmdValidate,
    verify: cmdVerify,
    'sync-vercel': cmdSyncVercel,
    'generate-cloudflare': cmdGenerateCloudflare,
  }

  const handler = commands[args.command]

  if (!handler) {
    logError(`Unknown command: ${args.command}`)
    logInfo('Run: node scripts/domains.mjs help')
    process.exit(1)
  }

  try {
    await handler(args)
  } catch (error) {
    logError(`Command failed: ${error.message}`)
    if (args.flags.debug) {
      console.error(error)
    }
    process.exit(1)
  }
}

main()
