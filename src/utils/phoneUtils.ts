import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export interface CountryInfo {
  code: string; // ISO 2-letter
  name: string;
  dialCode: string; // e.g. +91, +1, +44
  flag: string;
  example: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', example: '98765 43210' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', example: '202 555 0123' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', example: '7911 123456' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', example: '416 555 0199' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', example: '412 345 678' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', example: '50 123 4567' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', example: '8123 4567' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', example: '151 23456789' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', example: '6 12 34 56 78' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', example: '90 1234 5678' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', example: '21 123 4567' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', example: '12 345 6789' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', example: '812 3456 7890' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', example: '917 123 4567' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', example: '81 234 5678' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', example: '91 234 5678' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', example: '1712 345678' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', example: '984 1234567' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', example: '71 234 5678' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', example: '300 1234567' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', example: '50 123 4567' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', example: '3312 3456' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', example: '9123 4567' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', example: '9123 4567' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', example: '3612 3456' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', example: '82 123 4567' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', example: '802 123 4567' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', example: '712 345678' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', example: '100 123 4567' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', example: '11 91234 5678' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', example: '55 1234 5678' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', example: '9 11 1234 5678' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', example: '612 34 56 78' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', example: '312 345 6789' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', example: '6 12345678' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', example: '79 123 45 67' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', example: '70 123 45 67' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', example: '412 34 567' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', example: '20 12 34 56' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', example: '85 123 4567' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', example: '10 1234 5678' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', example: '138 0013 8000' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', example: '9123 4567' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼', example: '912 345 678' }
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India (+91) as primary, but fully selectable

/**
 * Normalizes user dial code & national number to strict E.164 (e.g. +919876543210)
 */
export function normalizeToE164(dialCode: string, rawNumber: string): string {
  if (!rawNumber) return '';
  const cleanDial = dialCode.startsWith('+') ? dialCode : `+${dialCode.replace(/\D/g, '')}`;
  const cleanDigits = rawNumber.replace(/\D/g, '');
  if (!cleanDigits) return '';

  // If user already typed the full country code in rawNumber
  if (rawNumber.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(rawNumber);
    if (parsed) return parsed.number;
    return rawNumber.replace(/[^\d+]/g, '');
  }

  const combined = `${cleanDial}${cleanDigits}`;
  const parsed = parsePhoneNumberFromString(combined);
  if (parsed) {
    return parsed.number;
  }
  return combined;
}

/**
 * Validates international phone number against E.164 standard using libphonenumber-js
 */
export function validateInternationalPhone(
  dialCode: string,
  rawNumber: string,
  countryIso?: string
): { isValid: boolean; error?: string; normalized: string } {
  const trimmed = (rawNumber || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Please enter a valid emergency contact number.',
      normalized: ''
    };
  }

  // Prevent arbitrary non-numeric text
  const digitOnly = trimmed.replace(/\D/g, '');
  if (digitOnly.length < 6 || digitOnly.length > 15) {
    return {
      isValid: false,
      error: 'Please enter a valid emergency contact number (between 6 and 15 digits).',
      normalized: ''
    };
  }

  const fullPhone = normalizeToE164(dialCode, trimmed);
  const parsed = parsePhoneNumberFromString(fullPhone, countryIso as CountryCode);

  if (parsed && parsed.isValid()) {
    return {
      isValid: true,
      normalized: parsed.number
    };
  }

  // If libphonenumber strict check fails but standard digit count is valid internationally
  if (fullPhone.startsWith('+') && fullPhone.length >= 8 && fullPhone.length <= 16) {
    return {
      isValid: true,
      normalized: fullPhone
    };
  }

  return {
    isValid: false,
    error: 'Please enter a valid emergency contact number for the selected country.',
    normalized: ''
  };
}

/**
 * Formats a phone number for user-friendly display (e.g. +91 98765 43210 or +1 202-555-0123)
 */
export function formatDisplayPhone(phone?: string): string {
  if (!phone) return 'Not configured';
  const parsed = parsePhoneNumberFromString(phone);
  if (parsed) {
    return parsed.formatInternational();
  }
  return phone;
}

/**
 * Parses an existing normalized phone string into dialCode and nationalNumber
 */
export function parsePhoneComponents(phone?: string): { country: CountryInfo; nationalNumber: string } {
  if (!phone) {
    return { country: DEFAULT_COUNTRY, nationalNumber: '' };
  }

  const clean = phone.trim();
  const parsed = parsePhoneNumberFromString(clean);

  if (parsed && parsed.country) {
    const found = COUNTRIES.find(c => c.code === parsed.country);
    if (found) {
      return {
        country: found,
        nationalNumber: parsed.nationalNumber
      };
    }
  }

  // Fallback match prefix dialCode
  for (const c of COUNTRIES) {
    if (clean.startsWith(c.dialCode)) {
      return {
        country: c,
        nationalNumber: clean.substring(c.dialCode.length).trim()
      };
    }
  }

  return {
    country: DEFAULT_COUNTRY,
    nationalNumber: clean.replace(/^\+/, '')
  };
}
