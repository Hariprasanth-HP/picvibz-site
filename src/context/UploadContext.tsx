import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useAppContext } from './AppContext';
import { AlertCircle, CheckCircle, X, UploadCloud, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface UploadTask {
  id: string;
  file: File;
  eventId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadContextType {
  uploads: UploadTask[];
  uploadFiles: (files: File[], eventId: string) => void;
  removeUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUpload must be used within an UploadProvider');
  return context;
};

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const { user } = useAuth();
  const { addPhoto, events } = useAppContext();

  const processUpload = useCallback(async (uploadTask: UploadTask) => {
    if (!user) return;

    setUploads(prev => prev.map(u => u.id === uploadTask.id ? { ...u, status: 'uploading', progress: 50 } : u));

    try {
      const photo = await api.uploadPhoto(uploadTask.eventId, uploadTask.file);

      const isVideo = uploadTask.file.type.startsWith('video/');
      const isGif = uploadTask.file.type === 'image/gif';
      const mediaType = isVideo ? 'video' : (isGif ? 'gif' : 'image');

      addPhoto(uploadTask.eventId, {
        url: photo.file.previewUrl || photo.file.originalUrl,
        uploader: photo.user.displayName,
        type: mediaType,
        nameCluster: 'Just Uploaded',
        fileName: photo.file.originalName,
        fileSize: photo.file.size,
      });

      setUploads(prev => prev.map(u => u.id === uploadTask.id ? { ...u, status: 'success', progress: 100 } : u));

      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.id !== uploadTask.id));
      }, 5000);
    } catch (err: any) {
      console.error("Upload failed", err);
      setUploads(prev => prev.map(u => u.id === uploadTask.id ? { ...u, status: 'error', error: err.message || 'Upload failed' } : u));
    }
  }, [user, addPhoto]);

  const uploadFiles = useCallback((files: File[], eventId: string) => {
    const event = events.find(e => e.id === eventId);

    const newUploads: UploadTask[] = [];
    const skippedUploads: UploadTask[] = [];

    files.forEach(file => {
      const isDuplicate = event?.photos.some(p => p.fileName === file.name && p.fileSize === file.size);

      if (isDuplicate) {
        skippedUploads.push({
          id: `skipped_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          file,
          eventId,
          progress: 0,
          status: 'error',
          error: 'Duplicate file skipped'
        });
      } else {
        newUploads.push({
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          file,
          eventId,
          progress: 0,
          status: 'pending'
        });
      }
    });

    if (newUploads.length === 0 && skippedUploads.length === 0) return;

    setUploads(prev => [...prev, ...newUploads, ...skippedUploads]);
    setIsExpanded(true);

    newUploads.forEach(upload => {
      processUpload(upload);
    });

    if (skippedUploads.length > 0) {
      setTimeout(() => {
        setUploads(prev => prev.filter(u => !u.id.startsWith('skipped_')));
      }, 5000);
    }
  }, [processUpload, events]);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const retryUpload = useCallback((id: string) => {
    setUploads(prev => {
      const upload = prev.find(u => u.id === id);
      if (upload) {
        processUpload(upload);
      }
      return prev;
    });
  }, [processUpload]);

  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'success'));
  }, []);

  const activeUploadsCount = uploads.filter(u => u.status === 'uploading' || u.status === 'pending').length;
  const successUploadsCount = uploads.filter(u => u.status === 'success').length;

  return (
    <UploadContext.Provider value={{ uploads, uploadFiles, removeUpload, retryUpload, clearCompleted }}>
      {children}

      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50 flex flex-col pointer-events-none"
          >
            <div className="bg-popover dark:bg-[#1A1A1A] border border-border dark:border-white/10 rounded-t-xl p-3 shadow-lg pointer-events-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary">
                  <UploadCloud size={14} className={activeUploadsCount > 0 ? 'animate-bounce' : ''} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-foreground">
                  {activeUploadsCount > 0 ? `Uploading ${activeUploadsCount} files...` : 'Uploads Complete'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {successUploadsCount > 0 && activeUploadsCount === 0 && (
                  <button
                    onClick={clearCompleted}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-popover dark:bg-[#1A1A1A] border-x border-b border-border dark:border-white/10 rounded-b-xl shadow-lg pointer-events-auto overflow-hidden"
                >
                  <div className="max-h-64 overflow-y-auto divide-y divide-border dark:divide-white/5 no-scrollbar">
                    {uploads.map(upload => (
                      <motion.div
                        key={upload.id}
                        layout
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        className="p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                            {upload.status === 'uploading' || upload.status === 'pending' ? (
                              <div className="relative flex items-center justify-center">
                                <UploadCloud className="text-primary shrink-0" size={16} />
                                <div className="absolute inset-0 animate-ping bg-primary/20 rounded-full" />
                              </div>
                            ) : upload.status === 'success' ? (
                              <CheckCircle className="text-green-500 shrink-0" size={16} />
                            ) : (
                              <AlertCircle className="text-red-500 shrink-0" size={16} />
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate text-foreground">
                                {upload.file.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">
                                {upload.status === 'uploading' ? `${Math.round(upload.progress)}%` : upload.status}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeUpload(upload.id)}
                            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="w-full bg-muted dark:bg-white/5 rounded-full h-1 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${upload.progress}%`,
                              backgroundColor: upload.status === 'error' ? '#ef4444' : (upload.status === 'success' ? '#22c55e' : '#a855f7')
                            }}
                            className="h-full rounded-full transition-all duration-300"
                          />
                        </div>

                        {upload.status === 'error' && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-red-500 font-medium truncate pr-2">
                              {upload.error || 'Failed'}
                            </span>
                            <button
                              onClick={() => retryUpload(upload.id)}
                              className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </UploadContext.Provider>
  );
};