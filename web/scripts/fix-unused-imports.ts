#!/usr/bin/env npx ts-node
/**
 * Script to remove unused imports from TypeScript files
 * Uses TypeScript's language service to identify and remove unused imports
 */

import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'

const rootDir = path.resolve(__dirname, '..')

// Find all TypeScript files
function findTsFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    // Skip node_modules, .next, and other non-source directories
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'coverage', '_archive', 'storybook-static'].includes(entry.name)) {
        findTsFiles(fullPath, files)
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      // Skip test files, config files
      if (!entry.name.includes('.test.') && !entry.name.includes('.spec.') && !entry.name.includes('.config.')) {
        files.push(fullPath)
      }
    }
  }
  
  return files
}

// Parse a file and find unused imports
function removeUnusedImports(filePath: string): { changed: boolean; removed: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8')
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
  
  // Collect all identifiers used in the file (excluding imports)
  const usedIdentifiers = new Set<string>()
  const importedIdentifiers = new Map<string, { start: number; end: number; importNode: ts.ImportDeclaration }>()
  
  function visit(node: ts.Node) {
    // Track imported identifiers
    if (ts.isImportDeclaration(node)) {
      const importClause = node.importClause
      if (importClause) {
        // Default import
        if (importClause.name) {
          importedIdentifiers.set(importClause.name.text, {
            start: node.getStart(),
            end: node.getEnd(),
            importNode: node
          })
        }
        
        // Named imports
        if (importClause.namedBindings) {
          if (ts.isNamedImports(importClause.namedBindings)) {
            for (const element of importClause.namedBindings.elements) {
              importedIdentifiers.set(element.name.text, {
                start: node.getStart(),
                end: node.getEnd(),
                importNode: node
              })
            }
          } else if (ts.isNamespaceImport(importClause.namedBindings)) {
            importedIdentifiers.set(importClause.namedBindings.name.text, {
              start: node.getStart(),
              end: node.getEnd(),
              importNode: node
            })
          }
        }
      }
    }
    
    // Track used identifiers (excluding import declarations)
    if (ts.isIdentifier(node) && !ts.isImportDeclaration(node.parent) && !ts.isImportSpecifier(node.parent) && !ts.isImportClause(node.parent)) {
      usedIdentifiers.add(node.text)
    }
    
    ts.forEachChild(node, visit)
  }
  
  visit(sourceFile)
  
  // Find unused imports
  const unusedImports: string[] = []
  for (const [name] of importedIdentifiers) {
    if (!usedIdentifiers.has(name)) {
      unusedImports.push(name)
    }
  }
  
  if (unusedImports.length === 0) {
    return { changed: false, removed: [] }
  }
  
  // For now, just report - actual removal is complex due to partial imports
  console.log(`${filePath}:`)
  console.log(`  Unused: ${unusedImports.join(', ')}`)
  
  return { changed: false, removed: unusedImports }
}

// Main
const files = findTsFiles(path.join(rootDir, 'app'))
  .concat(findTsFiles(path.join(rootDir, 'components')))
  .concat(findTsFiles(path.join(rootDir, 'lib')))

console.log(`Found ${files.length} TypeScript files to check`)

let totalUnused = 0
for (const file of files) {
  const result = removeUnusedImports(file)
  totalUnused += result.removed.length
}

console.log(`\nTotal unused imports found: ${totalUnused}`)
