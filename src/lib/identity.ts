import { toLatinDigits } from './datetime'

export const USERNAME_ENGLISH_PATTERN = /^[A-Za-z0-9._-]+$/
export const USERNAME_STRICT_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/

const PERSIAN_KEYBOARD_TO_EN: Record<string, string> = {
  ض: 'q',
  ص: 'w',
  ث: 'e',
  ق: 'r',
  ف: 't',
  غ: 'y',
  ع: 'u',
  ه: 'i',
  خ: 'o',
  ح: 'p',
  ش: 'a',
  س: 's',
  ی: 'd',
  ي: 'd',
  ب: 'f',
  ل: 'g',
  ا: 'h',
  ت: 'j',
  ن: 'k',
  م: 'l',
  ظ: 'z',
  ط: 'x',
  ز: 'c',
  ر: 'v',
  ذ: 'b',
  د: 'n',
  پ: 'm',
}

export function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isPhoneReady(digits: string, iranian: boolean) {
  return iranian ? /^09\d{9}$/.test(digits) : digits.length >= 8
}

export function sanitizeUsername(value: string) {
  return [...toLatinDigits(value)]
    .map((ch) => PERSIAN_KEYBOARD_TO_EN[ch] ?? ch)
    .join('')
    .replace(/[^A-Za-z0-9._-]/g, '')
}

export function preferEnglishKeyboard(input: HTMLInputElement) {
  input.lang = 'en'
  input.dir = 'ltr'
  input.style.setProperty('ime-mode', 'disabled')
}
