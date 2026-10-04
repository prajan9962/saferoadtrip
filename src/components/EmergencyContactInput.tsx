import React, { useState, useEffect } from 'react';
import { COUNTRIES, CountryInfo, DEFAULT_COUNTRY, validateInternationalPhone, parsePhoneComponents } from '../utils/phoneUtils';
import { Phone, ChevronDown, Check, AlertCircle } from 'lucide-react';

interface EmergencyContactInputProps {
  phone: string; // Full normalized E.164
  onChange: (phone: string, countryCode: string, nationalNumber: string, isValid: boolean) => void;
  required?: boolean;
  idPrefix?: string;
  disabled?: boolean;
}

export const EmergencyContactInput: React.FC<EmergencyContactInputProps> = ({
  phone,
  onChange,
  required = true,
  idPrefix = 'ec-phone',
  disabled = false
}) => {
  const initialParsed = parsePhoneComponents(phone);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(initialParsed.country || DEFAULT_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState<string>(initialParsed.nationalNumber || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [touched, setTouched] = useState(false);

  // Sync if external phone prop changes
  useEffect(() => {
    if (phone) {
      const parsed = parsePhoneComponents(phone);
      setSelectedCountry(parsed.country);
      setNationalNumber(parsed.nationalNumber);
    }
  }, [phone]);

  const validation = validateInternationalPhone(
    selectedCountry.dialCode,
    nationalNumber,
    selectedCountry.code
  );

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow digits, spaces, hyphens, parentheses
    const sanitized = rawVal.replace(/[^\d\s\-()]/g, '');
    setNationalNumber(sanitized);
    setTouched(true);

    const valResult = validateInternationalPhone(
      selectedCountry.dialCode,
      sanitized,
      selectedCountry.code
    );

    onChange(
      valResult.isValid ? valResult.normalized : `${selectedCountry.dialCode}${sanitized.replace(/\D/g, '')}`,
      selectedCountry.dialCode,
      sanitized.replace(/\D/g, ''),
      valResult.isValid
    );
  };

  const handleCountrySelect = (country: CountryInfo) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery('');
    setTouched(true);

    const valResult = validateInternationalPhone(
      country.dialCode,
      nationalNumber,
      country.code
    );

    onChange(
      valResult.isValid ? valResult.normalized : `${country.dialCode}${nationalNumber.replace(/\D/g, '')}`,
      country.dialCode,
      nationalNumber.replace(/\D/g, ''),
      valResult.isValid
    );
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.dialCode.includes(searchQuery) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showError = touched && required && nationalNumber.length > 0 && !validation.isValid;

  return (
    <div className="space-y-1.5 font-mono">
      <label htmlFor={`${idPrefix}-input`} className="text-xs font-semibold text-slate-300 flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <Phone className="w-3.5 h-3.5 text-[#4ADE80]" />
          <span>Phone Number (International)</span>
        </span>
        {required && <span className="text-[10px] text-amber-400 font-bold uppercase">*Required</span>}
      </label>

      <div className="relative">
        <div className="flex rounded-lg border border-[#2D3139] bg-[#0A0B0E] focus-within:border-[#4ADE80] transition-colors overflow-hidden">
          {/* Country Selector Button */}
          <button
            type="button"
            id={`${idPrefix}-country-btn`}
            disabled={disabled}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-1.5 px-3 py-2.5 bg-[#1A1D24] hover:bg-[#252932] text-white border-r border-[#2D3139] text-xs shrink-0 transition-colors focus:outline-none font-mono"
            title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="font-bold text-white">{selectedCountry.dialCode}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* National Phone Input */}
          <input
            type="tel"
            id={`${idPrefix}-input`}
            value={nationalNumber}
            onChange={handleNumberChange}
            onBlur={() => setTouched(true)}
            disabled={disabled}
            placeholder={`e.g. ${selectedCountry.example}`}
            required={required}
            className="w-full bg-[#0A0B0E] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
        </div>

        {/* Country Dropdown Popup */}
        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1.5 w-72 max-h-64 overflow-y-auto bg-[#11141A] border border-[#2D3139] rounded-lg shadow-xl z-50 py-1 text-xs font-mono">
              <div className="p-2 border-b border-[#2D3139] sticky top-0 bg-[#11141A]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country or code..."
                  autoFocus
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#4ADE80]"
                />
              </div>

              <div className="divide-y divide-[#2D3139]">
                {filteredCountries.map(country => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className="w-full px-3 py-2 text-left hover:bg-[#1A1D24] flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-base">{country.flag}</span>
                      <span className="text-slate-200 font-medium truncate">{country.name}</span>
                    </div>
                    <span className="text-[#4ADE80] font-mono shrink-0 ml-2 font-bold">{country.dialCode}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {showError && (
        <div className="text-[11px] text-red-400 flex items-center space-x-1 pt-0.5 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Please enter a valid phone number.</span>
        </div>
      )}
    </div>
  );
};
