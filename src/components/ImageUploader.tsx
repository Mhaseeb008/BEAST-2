import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Eye,
  Link as LinkIcon,
  Globe,
  Sparkles,
} from 'lucide-react';

export interface ImageUploaderProps {
  label: string;
  description?: string;
  currentUrl?: string | null;
  category: 'logo' | 'favicon' | 'background' | 'banner' | 'product';
  aspectRatio?: 'square' | 'wide' | 'banner' | 'any';
  recommendedDimensions?: string;
  token: string | null;
  onSave: (url: string) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  description,
  currentUrl,
  category,
  aspectRatio = 'any',
  recommendedDimensions,
  token,
  onSave,
  onRemove,
  disabled = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with currentUrl if it changes from external refresh
  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(currentUrl || null);
    }
  }, [currentUrl, pendingFile]);

  const validateAndReadFile = (file: File) => {
    setError(null);
    setSuccessMessage(null);

    // 12. Support PNG, JPG, and WebP formats
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];

    if (!allowedTypes.includes(file.type) && (!extension || !allowedExtensions.includes(extension))) {
      setError('Unsupported file type. Please upload a PNG, JPG, or WebP image.');
      return;
    }

    // 13. Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`Image file size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 10 MB limit.`);
      return;
    }

    // 6. Image preview before saving
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPendingBase64(result);
      setPreviewUrl(result);
      setPendingFile(file);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndReadFile(file);
    }
    // reset input so same file can be re-selected if desired
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndReadFile(file);
    }
  };

  // 7. Save Option
  const handleSave = async () => {
    if (!token) {
      setError('You must be logged in as an administrator to save images.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (pendingBase64) {
        // Upload to backend persistent storage
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            image: pendingBase64,
            category,
            filename: pendingFile?.name || `${category}.png`,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload image to server');
        }

        // Call parent onSave to store reference in database
        await onSave(data.url);
        setPreviewUrl(data.url);
        setPendingBase64(null);
        setPendingFile(null);
        setSuccessMessage('Image saved and updated successfully!');
      } else if (customUrl.trim()) {
        // Direct custom URL saved to database
        await onSave(customUrl.trim());
        setPreviewUrl(customUrl.trim());
        setShowUrlInput(false);
        setSuccessMessage('Image URL saved successfully!');
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Error uploading and saving image');
    } finally {
      setIsUploading(false);
    }
  };

  // 7. Remove Option
  const handleRemove = async () => {
    if (!token) return;
    setIsRemoving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // If currentUrl was an uploaded image, clean up backend storage
      if (currentUrl && currentUrl.startsWith('/uploads/')) {
        try {
          await fetch('/api/admin/upload', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ url: currentUrl }),
          });
        } catch {
          // ignore cleanup failures
        }
      }

      await onRemove();
      setPreviewUrl(null);
      setPendingBase64(null);
      setPendingFile(null);
      setCustomUrl('');
      setSuccessMessage('Image removed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove image');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCancelPending = () => {
    setPendingBase64(null);
    setPendingFile(null);
    setPreviewUrl(currentUrl || null);
    setError(null);
  };

  const hasUnsavedChanges = Boolean(pendingFile || pendingBase64);
  const hasSavedImage = Boolean(currentUrl && !hasUnsavedChanges);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">{label}</h4>
            {hasSavedImage && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <Check className="w-3 h-3" /> Active
              </span>
            )}
            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold animate-pulse">
                Preview (Unsaved)
              </span>
            )}
          </div>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>

        {recommendedDimensions && (
          <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
            {recommendedDimensions}
          </span>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Error & Success Alerts */}
      {error && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {/* Image Preview / Drop Area */}
      {previewUrl ? (
        <div className="space-y-3">
          {/* Category-Specific Preview Styling */}
          {category === 'favicon' ? (
            /* Favicon browser simulation preview */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Browser Tab Preview
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center gap-3 max-w-sm">
                <img
                  src={previewUrl}
                  alt="Favicon preview"
                  className="w-5 h-5 rounded object-contain bg-white/5 p-0.5 border border-slate-700"
                />
                <span className="text-xs font-medium text-slate-200 truncate">
                  BeastMC Network - Official Minecraft Server
                </span>
              </div>
            </div>
          ) : category === 'logo' ? (
            /* Logo on navbar simulation */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Navigation Bar Logo Preview
              </div>
              <div className="bg-[#070b12] border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Logo preview"
                  className="w-12 h-12 object-contain rounded-lg bg-slate-900/60 p-1 border border-emerald-500/30"
                />
                <div>
                  <div className="text-base font-black uppercase text-white tracking-wider">
                    BeastMC Network
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold">
                    Official Server & Store
                  </div>
                </div>
              </div>
            </div>
          ) : category === 'banner' ? (
            /* Wide Banner Preview */
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative group">
              <img
                src={previewUrl}
                alt="Banner preview"
                className="w-full h-28 sm:h-36 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex items-end p-3">
                <span className="text-xs font-bold text-white bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-sm">
                  Banner Live Preview
                </span>
              </div>
            </div>
          ) : category === 'background' ? (
            /* Homepage Background Preview */
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative h-36 sm:h-44">
              <img
                src={previewUrl}
                alt="Background preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-4">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  Homepage Hero Overlay Preview
                </div>
                <div className="text-base sm:text-lg font-black text-white uppercase">
                  Welcome to BeastMC Network
                </div>
              </div>
            </div>
          ) : (
            /* Store Product Image Preview */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-4">
              <img
                src={previewUrl}
                alt="Product preview"
                className="w-20 h-20 object-cover rounded-xl border border-slate-700 bg-slate-950"
              />
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase">Product Image</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Displays on the product store card, buy modal, and perk listings.
                </p>
              </div>
            </div>
          )}

          {/* Stored Image URL Reference */}
          {hasSavedImage && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800/80 font-mono break-all">
              <LinkIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{currentUrl}</span>
            </div>
          )}
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/40 hover:bg-slate-900/70 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all group ${
            disabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            Click to upload or drag & drop image
          </div>
          <div className="text-[11px] text-slate-400">
            PNG, JPG, or WebP format • Maximum size 10 MB
          </div>
        </div>
      )}

      {/* Direct Image URL toggle option */}
      {showUrlInput && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <label className="block text-[11px] font-bold text-slate-300 uppercase">
            Direct Image URL (External link)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/images/logo.png"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isUploading || !customUrl.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl disabled:opacity-50"
            >
              Apply URL
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons: 7. Save, Replace and Remove options */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Replace Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {previewUrl ? <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> : <Upload className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{previewUrl ? 'Replace Image' : 'Browse Files'}</span>
          </button>

          {/* Link URL toggle */}
          {!showUrlInput && (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              disabled={disabled || isUploading}
              className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl hover:bg-slate-900 transition-colors flex items-center gap-1"
            >
              <LinkIcon className="w-3 h-3" />
              <span>Use URL</span>
            </button>
          )}

          {/* Cancel Pending File */}
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleCancelPending}
              disabled={isUploading}
              className="px-3 py-2 text-slate-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Remove Button */}
          {(previewUrl || currentUrl) && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isUploading || isRemoving}
              className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 border border-red-800/50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Remove this image"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>{isRemoving ? 'Removing...' : 'Remove'}</span>
            </button>
          )}

          {/* 7. Save Button (Highlighted when file is selected and pending) */}
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || isUploading}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5 disabled:opacity-50 animate-pulse"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading & Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Image</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
