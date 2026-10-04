import React, { useState, useEffect } from 'react';
import { UserProfile, EmergencyContact } from '../types';
import { EmergencyContactInput } from './EmergencyContactInput';
import { User, Phone, Globe, HeartPulse, Save, Shield, LogOut, CheckCircle2, Mail, Users, BellRing, Smartphone, AlertCircle, Trash2, PlusCircle, HeartHandshake } from 'lucide-react';

interface UserProfileViewProps {
  currentUser: UserProfile;
  onUpdateProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
  onLogout?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  onUpdateProfile,
  onLogout
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [age, setAge] = useState(currentUser.age || 25);
  const [gender, setGender] = useState(currentUser.gender || 'Specified in Profile');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [language, setLanguage] = useState(currentUser.preferredLanguage || 'en');

  // Emergency Contact Profile
  const existingContact = currentUser.emergencyContact;
  const [contactName, setContactName] = useState(existingContact?.name || '');
  const [contactRelationship, setContactRelationship] = useState(existingContact?.relationship || 'Family');
  const [customRelationship, setCustomRelationship] = useState('');
  const [contactPhone, setContactPhone] = useState(existingContact?.phone || '');
  const [countryCode, setCountryCode] = useState(existingContact?.countryCode || '+91');
  const [nationalNumber, setNationalNumber] = useState(existingContact?.phoneNumber || '');
  const [isPhoneValid, setIsPhoneValid] = useState(Boolean(existingContact?.phone));
  const [contactEmail, setContactEmail] = useState(existingContact?.email || '');
  const [preferredMethod, setPreferredMethod] = useState<'SMS' | 'EMAIL' | 'BOTH' | 'CALL'>(
    existingContact?.preferredNotificationMethod || 'SMS'
  );
  const [isContactConfigured, setIsContactConfigured] = useState(Boolean(existingContact?.phone));

  // Medical Info
  const [bloodGroup, setBloodGroup] = useState(currentUser.medicalInfo?.bloodGroup || 'Not Specified');
  const [medicalConditions, setMedicalConditions] = useState(currentUser.medicalInfo?.medicalConditions || 'None reported');
  const [allergies, setAllergies] = useState(currentUser.medicalInfo?.allergies || 'None reported');

  // FCM Device Simulation
  const [isFcmValid, setIsFcmValid] = useState(currentUser.isFcmTokenValid !== false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(currentUser.name || '');
    setPhone(currentUser.phone || '');
    setAge(currentUser.age || 25);
    setGender(currentUser.gender || 'Specified in Profile');
    setLanguage(currentUser.preferredLanguage || 'en');

    const ec = currentUser.emergencyContact;
    if (ec && ec.phone) {
      setContactName(ec.name);
      setContactRelationship(ec.relationship || 'Family');
      setContactPhone(ec.phone);
      setCountryCode(ec.countryCode || '+91');
      setNationalNumber(ec.phoneNumber || '');
      setIsPhoneValid(true);
      setContactEmail(ec.email || '');
      setPreferredMethod(ec.preferredNotificationMethod || 'SMS');
      setIsContactConfigured(true);
    } else {
      setContactName('');
      setContactRelationship('Family');
      setContactPhone('');
      setCountryCode('+91');
      setNationalNumber('');
      setIsPhoneValid(false);
      setContactEmail('');
      setIsContactConfigured(false);
    }
  }, [currentUser]);

  const handleClearContact = () => {
    setContactName('');
    setContactPhone('');
    setCountryCode('+91');
    setNationalNumber('');
    setIsPhoneValid(false);
    setContactEmail('');
    setIsContactConfigured(false);
  };

  const handleAddContactClick = () => {
    setIsContactConfigured(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isContactConfigured) {
      if (!contactName.trim()) {
        setErrorMessage('Please enter an emergency contact name.');
        return;
      }
      if (!contactPhone || !isPhoneValid) {
        setErrorMessage('Please enter a valid emergency contact number.');
        return;
      }
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const finalRel = contactRelationship === 'Other' && customRelationship.trim() ? customRelationship.trim() : contactRelationship;
      const emergencyContactData: EmergencyContact | undefined = isContactConfigured && contactName && contactPhone ? {
        id: currentUser.emergencyContact?.id || 'ec_' + currentUser.id,
        userId: currentUser.id,
        name: contactName.trim(),
        relationship: finalRel.trim(),
        countryCode,
        phoneNumber: nationalNumber,
        phone: contactPhone.trim(),
        email: contactEmail.trim() || undefined,
        preferredNotificationMethod: preferredMethod,
        isVerified: true,
        createdAt: currentUser.emergencyContact?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } : undefined;

      await onUpdateProfile({
        name: name.trim(),
        phone: phone.trim(),
        age,
        gender,
        preferredLanguage: language,
        isFcmTokenValid: isFcmValid,
        fcmToken: currentUser.fcmToken || `fcm_${currentUser.id}_token`,
        emergencyContact: emergencyContactData,
        medicalInfo: {
          emergencyContactName: emergencyContactData?.name || '',
          emergencyContactPhone: emergencyContactData?.phone || '',
          bloodGroup,
          medicalConditions,
          allergies
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow space-y-6 max-w-3xl mx-auto font-mono">
      <div className="flex items-center justify-between border-b border-[#2D3139] pb-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#4ADE80] block">Personal Safety Records</span>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center space-x-2 font-sans">
            <User className="w-5 h-5 text-[#4ADE80]" />
            <span>Traveler Profile & Emergency Settings</span>
          </h2>
        </div>

        {saveSuccess && (
          <span className="text-xs bg-emerald-950/60 text-[#4ADE80] border border-emerald-800 px-3 py-1 rounded font-bold font-mono">
            Profile Saved
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-lg text-red-400 text-xs flex items-center space-x-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Account Status Card */}
      <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.name}
              className="w-11 h-11 rounded-full border border-[#2D3139] object-cover"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#1A1D24] text-[#4ADE80] font-bold flex items-center justify-center border border-[#2D3139]">
              {(currentUser.name || 'U').charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">{currentUser.name || 'Traveler'}</span>
              <span className="text-[10px] bg-emerald-950/60 text-[#4ADE80] border border-emerald-800 px-2 py-0.5 rounded font-semibold flex items-center space-x-1 font-mono">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {currentUser.firebaseUid}</p>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="bg-[#1A1D24] hover:bg-red-950/40 text-red-400 border border-[#2D3139] hover:border-red-800 font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-colors shrink-0 font-mono"
            id="logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        )}
      </div>

      {/* 1. Basic Identity */}
      <div className="space-y-4 font-mono">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#4ADE80]">1. Basic Identity Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Personal Mobile Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your contact number"
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              required
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Specified in Profile">Prefer not to say</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Registered Emergency Contact Profile */}
      <div className="border-t border-[#2D3139] pt-5 space-y-4 font-mono">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#4ADE80] flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-[#4ADE80]" />
            <span>2. Registered Emergency Contact</span>
          </h3>

          {isContactConfigured ? (
            <button
              type="button"
              onClick={handleClearContact}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center space-x-1 font-mono"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Contact</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddContactClick}
              className="text-xs text-[#4ADE80] hover:text-emerald-400 font-bold flex items-center space-x-1 font-mono"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Emergency Contact</span>
            </button>
          )}
        </div>

        {isContactConfigured ? (
          <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Contact Full Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Priya Sharma, John Doe"
                  required={isContactConfigured}
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Relationship</label>
                <select
                  value={contactRelationship}
                  onChange={(e) => setContactRelationship(e.target.value)}
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

                {contactRelationship === 'Other' && (
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

              <div className="sm:col-span-2">
                <EmergencyContactInput
                  phone={contactPhone}
                  onChange={(normalized, dialCode, national, valid) => {
                    setContactPhone(normalized);
                    setCountryCode(dialCode);
                    setNationalNumber(national);
                    setIsPhoneValid(valid);
                  }}
                  idPrefix="user-profile-ec-phone"
                  required={isContactConfigured}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Contact Email (Optional)</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@domain.com"
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Preferred Notification Method</label>
                <select
                  value={preferredMethod}
                  onChange={(e) => setPreferredMethod(e.target.value as any)}
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
                >
                  <option value="SMS">SMS Message (Instant Carrier Dispatch)</option>
                  <option value="EMAIL">Email Dispatch (Formatted Report)</option>
                  <option value="BOTH">Both SMS & Email Dispatch</option>
                  <option value="CALL">Automated Voice Call / SMS</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-950/60 border border-amber-800 rounded-lg p-4 text-center space-y-1 font-mono">
            <span className="text-xs text-amber-400 font-bold uppercase block">No Emergency Contact Configured</span>
            <p className="text-xs text-amber-300/80">
              When SOS is activated, the system notifies all expedition members and the leader, but personal contact dispatch is bypassed until configured.
            </p>
          </div>
        )}
      </div>

      {/* 3. FCM Device Registration Token Simulation */}
      <div className="border-t border-[#2D3139] pt-5 space-y-4 font-mono">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#4ADE80] flex items-center space-x-1.5">
          <Smartphone className="w-4 h-4 text-[#4ADE80]" />
          <span>3. Device Push Notification Token</span>
        </h3>
        <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isFcmValid ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-xs text-white font-bold">
                {isFcmValid ? 'Push Token Active & Connected' : 'Push Token Expired / Unreachable'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Token: {currentUser.fcmToken || `fcm_${currentUser.id}_default_token`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsFcmValid(!isFcmValid)}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors font-mono ${
              isFcmValid
                ? 'bg-[#1A1D24] text-slate-300 border-[#2D3139] hover:bg-[#252932]'
                : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isFcmValid ? 'Simulate Expired Token (Scenario 5)' : 'Restore Valid FCM Token'}
          </button>
        </div>
      </div>

      {/* 4. Emergency Medical Records */}
      <div className="border-t border-[#2D3139] pt-5 space-y-4 font-mono">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#4ADE80] flex items-center space-x-1.5">
          <HeartPulse className="w-4 h-4 text-[#4ADE80]" />
          <span>4. Confidential Medical Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            >
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="Not Specified">Not Specified</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Known Conditions</label>
            <input
              type="text"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              placeholder="e.g. Asthma, Diabetes"
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Allergies</label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts"
              className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#2D3139] pt-5 flex items-center justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-lg flex items-center space-x-2 transition-all shadow disabled:opacity-50 font-mono"
          id="save-profile-btn"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Profile...' : 'Save Profile & Settings'}</span>
        </button>
      </div>
    </form>
  );
};
