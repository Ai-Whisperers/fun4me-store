'use client'

import { X, ArrowLeft, ArrowRight, Upload, Check, Loader2, AlertCircle } from 'lucide-react'
import { useImportWizard } from '@/lib/hooks/use-import-wizard'
import { StepIndicator } from './step-indicator'
import { SourceStep } from './source-step'
import { PreviewStep } from './preview-step'
import { MappingStep } from './mapping-step'
import { ReviewStep } from './review-step'
import { CompleteStep } from './complete-step'

interface ImportWizardProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
  clinic: string
}

export function ImportWizard({ isOpen, onClose, onImportComplete, clinic }: ImportWizardProps) {
  const wizard = useImportWizard({
    clinic,
    isOpen,
    onClose,
    onImportComplete,
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-100 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Importar Inventario</h2>
            <button
              onClick={wizard.handleClose}
              className="rounded-lg p-2 hover:bg-gray-100"
              aria-label="Cerrar importación"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <StepIndicator currentStep={wizard.currentStep} steps={wizard.steps} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Error Display */}
          {wizard.error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-error)]" />
              <div className="flex-1">
                <p className="font-medium text-[var(--status-error-text)]">Error</p>
                <p className="mt-1 text-sm text-[var(--status-error)]">{wizard.error}</p>
              </div>
              <button
                onClick={() => wizard.setError(null)}
                className="text-[var(--status-error)]/60 hover:text-[var(--status-error)]"
                aria-label="Cerrar error"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Step Content */}
          {wizard.currentStep === 0 && (
            <SourceStep
              isParsingFile={wizard.isParsingFile}
              onFileSelect={wizard.handleFileSelect}
              onClipboardData={wizard.handleClipboardData}
            />
          )}

          {wizard.currentStep === 1 && (
            <PreviewStep rawHeaders={wizard.rawHeaders} rawRows={wizard.rawRows} />
          )}

          {wizard.currentStep === 2 && (
            <MappingStep
              rawHeaders={wizard.rawHeaders}
              rawRows={wizard.rawRows}
              columnMapping={wizard.columnMapping}
              savedMappings={wizard.savedMappings}
              selectedMappingId={wizard.selectedMappingId}
              showSaveMapping={wizard.showSaveMapping}
              newMappingName={wizard.newMappingName}
              isSavingMapping={wizard.isSavingMapping}
              onMappingChange={wizard.handleMappingChange}
              onApplyPreset={wizard.applyPresetMapping}
              onSaveMapping={wizard.saveCurrentMapping}
              onDeleteMapping={wizard.deleteMapping}
              onNewMappingNameChange={wizard.setNewMappingName}
              onShowSaveMappingChange={wizard.setShowSaveMapping}
            />
          )}

          {wizard.currentStep === 3 && wizard.previewResult && (
            <ReviewStep
              previewResult={wizard.previewResult}
              showOnlyErrors={wizard.showOnlyErrors}
              onShowOnlyErrorsChange={wizard.setShowOnlyErrors}
            />
          )}

          {wizard.currentStep === 4 && wizard.importResult && (
            <CompleteStep importResult={wizard.importResult} />
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between border-t border-gray-100 bg-gray-50 p-6">
          <button
            onClick={() =>
              wizard.currentStep === 0
                ? wizard.handleClose()
                : wizard.setCurrentStep(Math.max(0, wizard.currentStep - 1))
            }
            className="flex items-center gap-2 px-6 py-3 font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {wizard.currentStep === 0 ? 'Cancelar' : 'Atrás'}
          </button>

          {wizard.currentStep < 4 && (
            <button
              onClick={() => {
                if (wizard.currentStep === 1) {
                  wizard.setCurrentStep(2)
                } else if (wizard.currentStep === 2) {
                  wizard.runPreview()
                } else if (wizard.currentStep === 3) {
                  wizard.executeImport()
                }
              }}
              disabled={
                wizard.currentStep === 0 ||
                (wizard.currentStep === 2 && wizard.isLoadingPreview) ||
                (wizard.currentStep === 3 &&
                  (wizard.isImporting ||
                    (wizard.previewResult?.summary.newProducts === 0 &&
                      wizard.previewResult?.summary.updates === 0 &&
                      wizard.previewResult?.summary.adjustments === 0)))
              }
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {wizard.isLoadingPreview || wizard.isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : wizard.currentStep === 3 ? (
                <Upload className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {wizard.currentStep === 2 &&
                (wizard.isLoadingPreview ? 'Analizando...' : 'Revisar Cambios')}
              {wizard.currentStep === 3 &&
                (wizard.isImporting ? 'Importando...' : 'Confirmar Importación')}
              {wizard.currentStep === 1 && 'Continuar'}
            </button>
          )}

          {wizard.currentStep === 4 && (
            <button
              onClick={wizard.handleFinish}
              className="flex items-center gap-2 rounded-xl bg-[var(--status-success)] px-6 py-3 font-bold text-white transition hover:opacity-90"
            >
              <Check className="h-4 w-4" />
              Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
