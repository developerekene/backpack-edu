import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { uploadFile } from '../../lib/upload';

interface FileUploadProps {
  onUpload: (url: string, fileType: 'image' | 'video' | 'document') => void;
  accept?: string;
  label?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, accept = "image/*,video/*,.pdf,.doc,.docx", label = "Upload File" }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Reset input to allow selecting the same file again
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const url = await uploadFile(file);
      let type: 'image' | 'video' | 'document' = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      
      onUpload(url, type);
    } catch (err) {
      console.error('Upload Error:', err); setError('Failed to upload file: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-900 dark:text-white transition-colors">
        {uploading ? (
          <span className="flex items-center"><UploadCloud className="w-4 h-4 mr-2 animate-pulse" /> Uploading...</span>
        ) : (
          <span className="flex items-center"><UploadCloud className="w-4 h-4 mr-2" /> {label}</span>
        )}
        <input type="file" accept={accept} className="hidden" onChange={handleFileChange} disabled={uploading} />
      </label>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
};
