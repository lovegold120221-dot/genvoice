import React, { useState } from 'react';
import { CheckCircle, XCircle, Search, X } from 'lucide-react';

interface VatValidatorProps {
  onClose: () => void;
}

export function VatValidator({ onClose }: VatValidatorProps) {
  const [countryCode, setCountryCode] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateVat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryCode || !vatNumber) {
      setError('Please provide both country code and VAT number.');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: countryCode.trim().toUpperCase(), vatNumber: vatNumber.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to validate VAT');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161c] border border-[#26262e] rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-[#26262e]">
          <h2 className="text-[#f1f1f1] font-bold text-lg flex items-center gap-2">
            <Search size={20} className="text-indigo-400" />
            VAT Validator
          </h2>
          <button onClick={onClose} className="text-[#888892] hover:text-white transition-colors cursor-pointer border-none bg-transparent outline-none">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={validateVat} className="p-6 space-y-4">
          <div className="space-y-4 sm:flex sm:space-y-0 sm:gap-4">
            <div className="flex flex-col space-y-1.5 flex-1">
              <label className="text-sm font-medium text-[#888892]">Country Code</label>
              <input 
                type="text" 
                placeholder="e.g. DE, FR, IT"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.substring(0, 2))}
                maxLength={2}
                className="bg-[#111116] border border-[#26262e] rounded-lg px-3 py-2 text-[#f1f1f1] text-sm focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
            <div className="flex flex-col space-y-1.5 flex-[2]">
              <label className="text-sm font-medium text-[#888892]">VAT Number</label>
              <input 
                type="text" 
                placeholder="e.g. 123456789"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="bg-[#111116] border border-[#26262e] rounded-lg px-3 py-2 text-[#f1f1f1] text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none outline-none"
          >
            {loading ? 'Validating...' : 'Validate VAT'}
          </button>
        </form>

        {error && (
          <div className="px-6 pb-6">
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex gap-2">
              <XCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {result && (
          <div className="px-6 pb-6 space-y-4">
            <div className={`p-4 rounded-lg border flex gap-3 ${result.isValid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {result.isValid ? <CheckCircle size={24} className="flex-shrink-0" /> : <XCircle size={24} className="flex-shrink-0" />}
              <div className="space-y-1">
                <div className="font-bold">{result.isValid ? 'Valid VAT Number' : 'Invalid VAT Number'}</div>
                <div className="text-sm opacity-90">{result.countryCode}{result.vatNumber}</div>
              </div>
            </div>
            
            {result.isValid && (
              <div className="bg-[#111116] border border-[#26262e] rounded-lg p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#888892]">Name:</span>
                  <span className="text-[#f1f1f1] font-medium text-right max-w-[60%] truncate" title={result.name}>{result.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888892]">Address:</span>
                  <span className="text-[#f1f1f1] font-medium text-right max-w-[60%] truncate" title={result.address?.replace(/\n/g, ', ')}>{result.address?.replace(/\n/g, ', ') || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
