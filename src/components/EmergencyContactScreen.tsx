import React, { useState } from 'react';
import { UserProfile, EmergencyContact } from '../types';
import { EmergencyContactInput } from './EmergencyContactInput';
import { formatDisplayPhone, parsePhoneComponents, DEFAULT_COUNTRY } from '../utils/phoneUtils';
import {
  ShieldAlert,
  Phone,
  User,
  HeartHandshake,
  Edit2,
  Trash2,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Mail,
  BellRing,
  Check,
  X,
  Save,
  Globe
} from 'lucide-react';

interface EmergencyContactScreenProps {
  currentUser: UserProfile;
  onSaveContact: (contact: Partial<EmergencyContact>) => Promise<void>;
  onRemoveContact: () => Promise<void>;
}

export const EmergencyContactScreen: React.FC<EmergencyContactScreenProps> = ({
  currentUser,
  onSaveContact,
  onRemoveContact
}) => {
  const contact = currentUser.emergencyContact;
  const isConfigured = Boolean(contact && (contact.phone || contact.phoneNumber));

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [name, setName] = useState(contact?.name || '');
  const [relationship, setRelationship] = useState(contact?.relationship || 'Family');
  const [customRelationship, setCustomRelationship] = useState('');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [countryCode, setCountryCode] = useState(contact?.countryCode || '+91');
  const [nationalNumber, setNationalNumber] = useState(contact?.phoneNumber || '');
  const [isPhoneValid, setIsPhoneValid] = useState(Boolean(contact?.phone));
  const [email, setEmail] = useState(contact?.email || '');
  const [preferredMethod, setPreferredMethod] = useState<'SMS' | 'EMAIL' | 'BOTH' | 'CALL'>(
    contact?.preferredNotificationMethod || 'SMS'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTestingBackendSms, setIsTestingBackendSms] = useState(false);
  const [backendSmsResult, setBackendSmsResult] = useState<{ status: string; message: string } | null>(null);

  const handleTestBackendSms = async () => {
    setIsTestingBackendSms(true);
    setBackendSmsResult(null);
    try {
      const res = await fetch('/api/v1/users/me/test-emergency-sms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBackendSmsResult({
          status: data.result?.deliveryStatus || 'SENT',
          message: data.message || 'Test SMS dispatched by SafeRoad+ backend.'
        });
      } else {
        setBackendSmsResult({
          status: 'FAILED',
          message: data.message || 'Dispatch failed'
        });
      }
    } catch (err: any) {
      setBackendSmsResult({
        status: 'FAILED',
        message: err.message
      });
    } finally {
      setIsTestingBackendSms(false);
    }
  };

  const startEdit = () => {
    setName(contact?.name || '');
    setRelationship(contact?.relationship || 'Family');
    setCustomRelationship('');
    setPhone(contact?.phone || '');
    setCountryCode(contact?.countryCode || '+91');
    setNationalNumber(contact?.phoneNumber || '');
    setIsPhoneValid(Boolean(contact?.phone));
    setEmail(contact?.email || '');
    setPreferredMethod(contact?.preferredNotificationMethod || 'SMS');
    setIsEditing(true);
    setStatusMessage(null);
  };

  const startAdd = () => {
    setName('');
    setRelationship('Family');
    setCustomRelationship('');
    setPhone('');
    setCountryCode('+91');
    setNationalNumber('');
    setIsPhoneValid(false);
    setEmail('');
    setPreferredMethod('SMS');
    setIsEditing(true);
    setStatusMessage(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setStatusMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter contact person full name.' });
      return;
    }

    if (!phone || !isPhoneValid) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid emergency contact number.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalRel = relationship === 'Other' && customRelationship.trim() ? customRelationship.trim() : relationship;
      await onSaveContact({
        name: name.trim(),
        relationship: finalRel,
        countryCode,
        phoneNumber: nationalNumber,
        phone: phone.trim(),
        email: email.trim() || undefined,
        preferredNotificationMethod: preferredMethod
      });

      setIsEditing(false);
      setStatusMessage({ type: 'success', text: 'Emergency contact updated and synchronized successfully.' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save emergency contact.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await onRemoveContact();
      setShowDeleteConfirm(false);
      setIsEditing(false);
      setStatusMessage({ type: 'success', text: 'Emergency contact removed successfully.' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove emergency contact.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedCountry = contact?.phone ? parsePhoneComponents(contact.phone).country : DEFAULT_COUNTRY;

  return (
    <div className="space-y-6 max-w-3xl mx-auto font-mono">
      {/* Top Banner */}
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2D3139] pb-5">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#4ADE80] block">Personal Safety Settings</span>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center space-x-2 font-sans">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Emergency Contact Profile</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Registered primary contact person for high-urgency notifications and distress broadcasts.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0 font-mono">
            <span className="text-xs text-slate-400">Traveler:</span>
            <span className="text-xs font-bold text-white bg-[#1A1D24] px-3 py-1 rounded border border-[#2D3139]">
              {currentUser.name}
            </span>
          </div>
        </div>

        {/* Status / Alert feedback */}
        {statusMessage && (
          <div className={`mt-4 p-3.5 rounded-lg border text-xs flex items-center justify-between font-mono ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-[#4ADE80]'
              : 'bg-red-950/60 border-red-800 text-red-400'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="p-0.5 hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View / Edit Mode */}
        {!isEditing ? (
          <div className="mt-6 space-y-5">
            {isConfigured && contact ? (
              <div className="bg-[#11141A] border border-[#2D3139] rounded-xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#2D3139] pb-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-white">Active Emergency Contact</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      id="edit-emergency-contact-btn"
                      onClick={startEdit}
                      className="px-3.5 py-1.5 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors font-mono"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      id="remove-emergency-contact-btn"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3.5 py-1.5 bg-red-950/40 hover:bg-red-950/80 border border-red-800 text-red-400 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors font-mono"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-[#0A0B0E] p-4 rounded-lg border border-[#2D3139]">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Contact Name</span>
                    <span className="text-sm font-bold text-white mt-1 block flex items-center space-x-2">
                      <User className="w-4 h-4 text-[#4ADE80]" />
                      <span>{contact.name}</span>
                    </span>
                  </div>

                  <div className="bg-[#0A0B0E] p-4 rounded-lg border border-[#2D3139]">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Relationship</span>
                    <span className="text-sm font-bold text-white mt-1 block flex items-center space-x-2">
                      <HeartHandshake className="w-4 h-4 text-amber-500" />
                      <span>{contact.relationship}</span>
                    </span>
                  </div>

                  <div className="bg-[#0A0B0E] p-4 rounded-lg border border-[#2D3139]">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Phone Number</span>
                    <span className="text-sm font-bold text-[#4ADE80] font-mono mt-1 block flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-[#4ADE80]" />
                      <span>{formatDisplayPhone(contact.phone)}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Region: {parsedCountry.flag} {parsedCountry.name} ({parsedCountry.dialCode})
                    </span>
                  </div>

                  <div className="bg-[#0A0B0E] p-4 rounded-lg border border-[#2D3139]">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Dispatch Channel</span>
                    <span className="text-xs font-bold text-slate-200 mt-1 block flex items-center space-x-2">
                      <BellRing className="w-4 h-4 text-[#4ADE80]" />
                      <span>{contact.preferredNotificationMethod || 'SMS'} Dispatch</span>
                    </span>
                    {contact.email && (
                      <span className="text-[10px] text-slate-500 mt-1 block truncate">
                        Email: {contact.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct Emergency Dispatch Actions */}
                <div className="p-4 bg-[#0A0B0E] border border-[#2D3139] rounded-lg space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Emergency Notification Verification:
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                      Automatic Backend SMS
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    When SOS is activated, SafeRoad+ automatically dispatches an emergency SMS with your live GPS location and map link to <strong className="text-slate-200">{contact.phone}</strong> through the SafeRoad+ backend gateway. No native app opens and no user action is needed.
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleTestBackendSms}
                      disabled={isTestingBackendSms}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold text-xs rounded-lg inline-flex items-center space-x-2 transition-all shadow font-mono"
                      id="test-backend-sms-btn"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>{isTestingBackendSms ? 'Dispatching Test via SMS Gateway...' : '⚡ Test Automatic Backend SMS Dispatch'}</span>
                    </button>
                    {backendSmsResult && (
                      <div className={`mt-2 p-2.5 rounded text-xs font-mono border ${
                        backendSmsResult.status === 'SENT' || backendSmsResult.status === 'DELIVERED'
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                          : 'bg-red-950/50 border-red-800 text-red-300'
                      }`}>
                        <strong>Status: {backendSmsResult.status}</strong> — {backendSmsResult.message}
                      </div>
                    )}
                  </div>

                  {/* Secondary Manual Device Channels */}
                  <div className="pt-3 border-t border-[#1F232B] space-y-2">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-sans">
                      Secondary Manual Channels (Optional Backup Only):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <a
                        href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                        className="px-3 py-2 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-200 font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors font-mono"
                        id="test-call-contact-btn"
                      >
                        <Phone className="w-3.5 h-3.5 text-blue-400" />
                        <span>Direct Call</span>
                      </a>

                      <a
                        href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `🚨 *SafeRoad+ Test Alert* from *${currentUser.name}*:\nEmergency contact connection is verified and active.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-200 font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors font-mono"
                        id="test-whatsapp-contact-btn"
                      >
                        <span>💬 WhatsApp</span>
                      </a>

                      <a
                        href={`sms:${contact.phone}?body=${encodeURIComponent(
                          `🚨 SafeRoad+ Test Alert from ${currentUser.name}: Emergency contact connection verified.`
                        )}`}
                        className="px-3 py-2 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-400 hover:text-slate-200 font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors font-mono text-[11px]"
                        id="test-sms-contact-btn"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Native SMS (Backup)</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#0A0B0E] border border-[#2D3139] rounded-lg flex items-center space-x-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Linked exclusively to your authenticated SafeRoad+ account ({currentUser.id}).
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#11141A] border border-dashed border-[#2D3139] rounded-xl p-8 sm:p-10 text-center space-y-4 font-mono">
                <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    Emergency Contact Not Configured
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                    When you activate SOS during an expedition, team members and the Trip Leader receive instant notifications. Adding a personal contact enables direct SMS broadcasts to family.
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    id="add-emergency-contact-btn"
                    onClick={startAdd}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg inline-flex items-center space-x-2 transition-all shadow font-mono"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Emergency Contact</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* EDIT / ADD FORM */
          <form onSubmit={handleSave} className="mt-6 bg-[#11141A] border border-[#2D3139] rounded-xl p-5 sm:p-6 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#2D3139] pb-3">
              <span className="text-xs font-bold text-white flex items-center space-x-2">
                <Edit2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span>{isConfigured ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</span>
              </span>

              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Contact Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Contact Name</span>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">*Required</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma, John Doe"
                  required
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] font-mono"
                />
              </div>

              {/* Relationship */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] font-mono"
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
                    className="w-full mt-2 bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2 focus:outline-none focus:border-[#4ADE80] font-mono"
                  />
                )}
              </div>

              {/* International Phone Input */}
              <div className="sm:col-span-2">
                <EmergencyContactInput
                  phone={phone}
                  onChange={(normalizedPhone, dialCode, national, valid) => {
                    setPhone(normalizedPhone);
                    setCountryCode(dialCode);
                    setNationalNumber(national);
                    setIsPhoneValid(valid);
                  }}
                  idPrefix="profile-ec-phone"
                />
              </div>

              {/* Email (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Contact Email</span>
                  <span className="text-[10px] text-slate-500">Optional</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@email.com"
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] font-mono"
                />
              </div>

              {/* Notification Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Preferred Dispatch Channel
                </label>
                <select
                  value={preferredMethod}
                  onChange={(e) => setPreferredMethod(e.target.value as any)}
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] font-mono"
                >
                  <option value="SMS">SMS Message (Instant Carrier Dispatch)</option>
                  <option value="EMAIL">Email Dispatch (Formatted Report)</option>
                  <option value="BOTH">Both SMS & Email Dispatch</option>
                  <option value="CALL">Automated Voice Call / SMS</option>
                </select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-[#2D3139] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-200 text-xs font-semibold rounded-lg transition-colors font-mono"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                id="save-emergency-contact-submit-btn"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-all shadow disabled:opacity-50 font-mono"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Emergency Contact'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
          <div className="w-full max-w-md bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-red-500 border-b border-[#2D3139] pb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-white font-sans">Remove Emergency Contact?</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to remove your emergency contact ({contact?.name})?
              If you activate SOS, expedition members and the Trip Leader will still receive notifications, but family SMS dispatch will be disabled.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-[#1A1D24] hover:bg-[#252932] text-slate-200 text-xs font-semibold rounded-lg transition-colors font-mono"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-remove-contact-btn"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow font-mono"
              >
                {isSubmitting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
