import React, { useState } from 'react';
import { UserProfile, EmergencyContact } from '../types';
import { EmergencyContactInput } from './EmergencyContactInput';
import { ShieldAlert, Save, X, User, HeartHandshake, Mail, Info } from 'lucide-react';

interface EmergencyContactSetupModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaveContact: (contact: Partial<EmergencyContact>) => Promise<void>;
}

export const EmergencyContactSetupModal: React.FC<EmergencyContactSetupModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSaveContact
}) => {
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('Spouse');
  const [customRelationship, setCustomRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [nationalNumber, setNationalNumber] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [preferredMethod, setPreferredMethod] = useState<'SMS' | 'EMAIL' | 'BOTH' | 'CALL'>('SMS');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!contactName.trim()) {
      setErrorMsg('Please enter the contact person\'s full name.');
      return;
    }

    if (!phone || !isPhoneValid) {
      setErrorMsg('Please enter a valid emergency contact number.');
      return;
    }

    setIsSaving(true);
    try {
      const finalRelationship = relationship === 'Other' && customRelationship.trim() ? customRelationship.trim() : relationship;
      await onSaveContact({
        name: contactName.trim(),
        relationship: finalRelationship,
        countryCode,
        phoneNumber: nationalNumber,
        phone: phone.trim(),
        email: contactEmail.trim() || undefined,
        preferredNotificationMethod: preferredMethod
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save emergency contact. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
      <div
        className="w-full max-w-lg bg-[#0F1218] border border-[#2D3139] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ec-setup-title"
      >
        {/* Header */}
        <div className="bg-[#11141A] border-b border-[#2D3139] p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-950/60 border border-amber-800 rounded-lg text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#4ADE80] font-bold block">Safety Setup</span>
              <h2 id="ec-setup-title" className="text-base font-bold text-white mt-0.5 font-sans">
                Set up your Emergency Contact
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 hover:bg-[#1A1D24] rounded-lg transition-colors"
            title="Skip for Now"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description Banner */}
        <div className="bg-[#0A0B0E] border-b border-[#2D3139] p-4 flex items-start space-x-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Your emergency contact will be notified automatically if you activate an SOS beacon during an active expedition.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 font-mono">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Contact Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span>Contact Name</span>
              </span>
              <span className="text-[10px] text-amber-400 font-bold uppercase">*Required</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Priya Sharma, John Doe"
              required
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            />
          </div>

          {/* Relationship */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Relationship</span>
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            >
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Spouse">Spouse / Partner</option>
              <option value="Sibling">Brother / Sister</option>
              <option value="Child">Son / Daughter</option>
              <option value="Friend">Close Friend</option>
              <option value="Colleague">Colleague / Work</option>
              <option value="Guardian">Legal Guardian</option>
              <option value="Other">Other (Custom)</option>
            </select>

            {relationship === 'Other' && (
              <input
                type="text"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
                placeholder="Specify relationship..."
                required
                className="w-full mt-2 bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2 focus:outline-none focus:border-[#4ADE80]"
              />
            )}
          </div>

          {/* International Phone Input */}
          <EmergencyContactInput
            phone={phone}
            onChange={(normalizedPhone, dialCode, national, valid) => {
              setPhone(normalizedPhone);
              setCountryCode(dialCode);
              setNationalNumber(national);
              setIsPhoneValid(valid);
            }}
            idPrefix="setup-ec-phone"
          />

          {/* Optional Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Address (Optional)</span>
              </span>
              <span className="text-[10px] text-slate-500">Optional</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="e.g. contact@domain.com"
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-[#2D3139] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#1A1D24] hover:bg-[#252932] text-slate-300 font-semibold text-xs rounded-lg transition-colors border border-[#2D3139]"
              id="skip-emergency-setup-btn"
            >
              Skip for Now
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition-all shadow disabled:opacity-50 font-mono"
              id="save-emergency-setup-btn"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Contact...' : 'Save Emergency Contact'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
