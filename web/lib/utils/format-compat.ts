/**
 * Backward Compatibility Shim for Formatting Functions
 *
 * This file provides backward compatibility for code using old formatting functions.
 * New code should import directly from '@/lib/formatting' instead.
 *
 * @deprecated This file exists only for backward compatibility.
 * Import from '@/lib/formatting' in new code.
 */

import {
  formatPrice as formatPriceNew,
  formatPriceGs as formatPriceGsNew,
  formatCurrency as formatCurrencyNew,
  parseCurrency as parseCurrencyNew,
  formatPriceRange as formatPriceRangeNew,
} from '@/lib/formatting/currency'

import {
  formatDate as formatDateNew,
  formatDateTime as formatDateTimeNew,
  formatTime as formatTimeNew,
  formatRelative as formatRelativeNew,
  formatAge as formatAgeNew,
  getLocalDateString as getLocalDateStringNew,
} from '@/lib/formatting/date'

import {
  formatNumber as formatNumberNew,
  formatPercentage as formatPercentageNew,
  formatBytes as formatBytesNew,
  formatWeight as formatWeightNew,
  formatTemperature as formatTemperatureNew,
} from '@/lib/formatting/number'

import {
  truncate as truncateNew,
  capitalize as capitalizeNew,
  titleCase as titleCaseNew,
  slugify as slugifyNew,
  initials as initialsNew,
  pluralize as pluralizeNew,
} from '@/lib/formatting/text'

// Currency
/**
 * @deprecated Use formatPrice from '@/lib/formatting' instead
 */
export const formatPrice = formatPriceNew

/**
 * @deprecated Use formatPriceGs from '@/lib/formatting' instead
 */
export const formatPriceGs = formatPriceGsNew

/**
 * @deprecated Use formatCurrency from '@/lib/formatting' instead
 */
export const formatCurrency = formatCurrencyNew

/**
 * @deprecated Use parseCurrency from '@/lib/formatting' instead
 */
export const parseCurrency = parseCurrencyNew

/**
 * @deprecated Use formatPriceRange from '@/lib/formatting' instead
 */
export const formatPriceRange = formatPriceRangeNew

// Date
/**
 * @deprecated Use formatDate from '@/lib/formatting' instead
 */
export const formatDate = formatDateNew

/**
 * @deprecated Use formatDateTime from '@/lib/formatting' instead
 */
export const formatDateTime = formatDateTimeNew

/**
 * @deprecated Use formatTime from '@/lib/formatting' instead
 */
export const formatTime = formatTimeNew

/**
 * @deprecated Use formatRelative from '@/lib/formatting' instead
 */
export const formatRelative = formatRelativeNew

/**
 * @deprecated Use formatAge from '@/lib/formatting' instead
 */
export const formatAge = formatAgeNew

/**
 * @deprecated Use getLocalDateString from '@/lib/formatting' instead
 */
export const getLocalDateString = getLocalDateStringNew

// Number
/**
 * @deprecated Use formatNumber from '@/lib/formatting' instead
 */
export const formatNumber = formatNumberNew

/**
 * @deprecated Use formatPercentage from '@/lib/formatting' instead
 */
export const formatPercentage = formatPercentageNew

/**
 * @deprecated Use formatBytes from '@/lib/formatting' instead
 */
export const formatBytes = formatBytesNew

/**
 * @deprecated Use formatWeight from '@/lib/formatting' instead
 */
export const formatWeight = formatWeightNew

/**
 * @deprecated Use formatTemperature from '@/lib/formatting' instead
 */
export const formatTemperature = formatTemperatureNew

// Text
/**
 * @deprecated Use truncate from '@/lib/formatting' instead
 */
export const truncate = truncateNew

/**
 * @deprecated Use capitalize from '@/lib/formatting' instead
 */
export const capitalize = capitalizeNew

/**
 * @deprecated Use titleCase from '@/lib/formatting' instead
 */
export const titleCase = titleCaseNew

/**
 * @deprecated Use slugify from '@/lib/formatting' instead
 */
export const slugify = slugifyNew

/**
 * @deprecated Use initials from '@/lib/formatting' instead
 */
export const initials = initialsNew

/**
 * @deprecated Use pluralize from '@/lib/formatting' instead
 */
export const pluralize = pluralizeNew
