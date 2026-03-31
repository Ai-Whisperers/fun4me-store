/**
 * Form Field Component Tests
 *
 * A11Y-003: Tests for accessible form field component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField, FormFieldGroup, RequiredIndicator } from '../../../components/forms/form-field'

describe('FormField component', () => {
  it('renders label with correct htmlFor', () => {
    render(
      <FormField id="test-input" label="Test Label">
        <input type="text" />
      </FormField>
    )

    const label = screen.getByText('Test Label')
    expect(label).toHaveAttribute('for', 'test-input')
  })

  it('passes id to child element', () => {
    render(
      <FormField id="test-input" label="Test Label">
        <input type="text" />
      </FormField>
    )

    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'test-input')
  })

  it('shows required indicator when required', () => {
    render(
      <FormField id="test" label="Required Field" required>
        <input type="text" />
      </FormField>
    )

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('(requerido)')).toBeInTheDocument()
  })

  it('renders error message with role="alert"', () => {
    render(
      <FormField id="test" label="Field" error="Error message">
        <input type="text" />
      </FormField>
    )

    const errorElement = screen.getByRole('alert')
    expect(errorElement).toHaveTextContent('Error message')
  })

  it('sets aria-invalid when error present', () => {
    render(
      <FormField id="test" label="Field" error="Error">
        <input type="text" />
      </FormField>
    )

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('sets aria-describedby to error id when error present', () => {
    render(
      <FormField id="my-field" label="Field" error="Error">
        <input type="text" />
      </FormField>
    )

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'my-field-error')
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'my-field-error')
  })

  it('renders hint when no error', () => {
    render(
      <FormField id="test" label="Field" hint="Helpful hint">
        <input type="text" />
      </FormField>
    )

    expect(screen.getByText('Helpful hint')).toBeInTheDocument()
  })

  it('sets aria-describedby to hint id when hint present', () => {
    render(
      <FormField id="my-field" label="Field" hint="Hint">
        <input type="text" />
      </FormField>
    )

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'my-field-hint')
    expect(screen.getByText('Hint')).toHaveAttribute('id', 'my-field-hint')
  })

  it('hides hint when error is present', () => {
    render(
      <FormField id="test" label="Field" error="Error" hint="Hint">
        <input type="text" />
      </FormField>
    )

    expect(screen.queryByText('Hint')).not.toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('hides label visually when showLabel is false', () => {
    render(
      <FormField id="test" label="Hidden Label" showLabel={false}>
        <input type="text" />
      </FormField>
    )

    expect(screen.getByText('Hidden Label')).toHaveClass('sr-only')
  })

  it('sets aria-required when required', () => {
    render(
      <FormField id="test" label="Field" required>
        <input type="text" />
      </FormField>
    )

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true')
  })

  it('applies custom className', () => {
    const { container } = render(
      <FormField id="test" label="Field" className="custom-class">
        <input type="text" />
      </FormField>
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('applies custom labelClassName', () => {
    render(
      <FormField id="test" label="Field" labelClassName="label-class">
        <input type="text" />
      </FormField>
    )

    expect(screen.getByText('Field')).toHaveClass('label-class')
  })

  it('preserves existing child props', () => {
    render(
      <FormField id="test" label="Field">
        <input type="text" placeholder="Enter text" className="my-input" />
      </FormField>
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('placeholder', 'Enter text')
    expect(input).toHaveClass('my-input')
  })
})

describe('FormFieldGroup component', () => {
  it('renders fieldset with legend', () => {
    render(
      <FormFieldGroup legend="Group Title">
        <input type="radio" name="option" value="a" />
        <input type="radio" name="option" value="b" />
      </FormFieldGroup>
    )

    expect(screen.getByRole('group')).toBeInTheDocument()
    expect(screen.getByText('Group Title')).toBeInTheDocument()
  })

  it('shows required indicator in legend', () => {
    render(
      <FormFieldGroup legend="Required Group" required>
        <input type="checkbox" />
      </FormFieldGroup>
    )

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('(requerido)')).toBeInTheDocument()
  })

  it('renders error message with role="alert"', () => {
    render(
      <FormFieldGroup legend="Group" error="Group error">
        <input type="checkbox" />
      </FormFieldGroup>
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Group error')
  })

  it('sets aria-describedby on fieldset for error', () => {
    render(
      <FormFieldGroup legend="Group" error="Error">
        <input type="checkbox" />
      </FormFieldGroup>
    )

    const fieldset = screen.getByRole('group')
    expect(fieldset).toHaveAttribute('aria-describedby')
    // Error id is dynamically generated, just check it exists
  })

  it('renders hint when no error', () => {
    render(
      <FormFieldGroup legend="Group" hint="Group hint">
        <input type="checkbox" />
      </FormFieldGroup>
    )

    expect(screen.getByText('Group hint')).toBeInTheDocument()
  })

  it('hides hint when error is present', () => {
    render(
      <FormFieldGroup legend="Group" error="Error" hint="Hint">
        <input type="checkbox" />
      </FormFieldGroup>
    )

    expect(screen.queryByText('Hint')).not.toBeInTheDocument()
  })

  it('hides legend visually when showLegend is false', () => {
    render(
      <FormFieldGroup legend="Hidden Legend" showLegend={false}>
        <input type="checkbox" />
      </FormFieldGroup>
    )

    expect(screen.getByText('Hidden Legend')).toHaveClass('sr-only')
  })

  it('applies custom className', () => {
    const { container } = render(
      <FormFieldGroup legend="Group" className="group-class">
        <input type="checkbox" />
      </FormFieldGroup>
    )

    expect(container.querySelector('fieldset')).toHaveClass('group-class')
  })

  it('renders children', () => {
    render(
      <FormFieldGroup legend="Group">
        <span data-testid="child">Child content</span>
      </FormFieldGroup>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})

describe('RequiredIndicator component', () => {
  it('renders asterisk with aria-hidden', () => {
    render(<RequiredIndicator />)

    const asterisk = screen.getByText('*')
    expect(asterisk).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders screen reader text', () => {
    render(<RequiredIndicator />)

    expect(screen.getByText('(requerido)')).toBeInTheDocument()
    expect(screen.getByText('(requerido)')).toHaveClass('sr-only')
  })
})
