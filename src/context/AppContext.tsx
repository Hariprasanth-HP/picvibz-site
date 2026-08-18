import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import type { ApiEvent } from '@/lib/api';
import type { ReactNode } from 'react';

export type EventType = 'Wedding' | 'House Warming' | 'Engagement' | 'Birthday' | 'Corporate' | 'Graduation' | 'Baby Shower' | 'Anniversary' | 'Reunion' | 'Party' | 'Other';

export interface DetectedPerson {
  name: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Unknown';
  relation?: string;
}

export interface Photo {
  id: string;
  url: string;
  eventId: string;
  uploader: string;
  uploaderId: string;
  uploadedAt: string;
  nameCluster?: string;
  detectedPeople?: DetectedPerson[];
  visualTags?: string[];
  giftGiven?: string;
  type: 'image' | 'video' | 'gif';
  folderName?: string;
  fileName?: string;
  fileSize?: number;
}

export interface LocalFolder {
  id: string;
  name: string;
  photos: Photo[];
}

export interface AppEvent {
  id: string;
  name: string;
  type: EventType;
  date: string;
  startDate?: string;
  endDate?: string;
  location: string;
  coverImage: string;
  photos: Photo[];
}

interface AppContextType {
  events: AppEvent[];
  localFolders: LocalFolder[];
  addEvent: (event: Omit<AppEvent, 'id' | 'photos'> & { id?: string; photos?: Photo[] }) => string;
  loadEvents: (apiEvents: ApiEvent[]) => void;
  eventPasses: number;
  setEventPasses: (passes: number) => void;
  autoUpload: boolean;
  setAutoUpload: (val: boolean) => void;
  autoUploadEvents: string[];
  toggleAutoUploadForEvent: (eventId: string, enabled: boolean) => void;
  mergeEvents: (event1Id: string, event2Id: string, newName: string) => void;
  addPhoto: (eventId: string, photo: Omit<Photo, 'id' | 'eventId' | 'uploadedAt' | 'uploaderId'>) => void;
  deletePhoto: (eventId: string, photoId: string) => void;
  deletePhotos: (eventId: string, photoIds: string[]) => void;
  setEventPhotos: (eventId: string, photos: Photo[]) => void;
  updatePhotoDetails: (eventId: string, photoId: string, details: Partial<Photo>) => void;
  addLocalFolder: (folder: LocalFolder) => void;
  updatePhotoClusters: (eventId: string, clusters: { clusterName: string; photoIds: string[]; detectedPeople?: Record<string, any[]>; visualTags?: Record<string, string[]> }[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [localFolders, setLocalFolders] = useState<LocalFolder[]>([]);
  const [eventPasses, setEventPasses] = useState<number>(0);
  const [autoUpload, setAutoUpload] = useState(false);
  const [autoUploadEvents, setAutoUploadEvents] = useState<string[]>([]);

  const { user: authUser } = useAuth();

  const toggleAutoUploadForEvent = (eventId: string, enabled: boolean) => {
    setAutoUploadEvents(prev =>
      enabled ? [...prev, eventId] : prev.filter(id => id !== eventId)
    );
  };

  const addEvent = (eventData: Omit<AppEvent, 'id' | 'photos'> & { id?: string; photos?: Photo[] }) => {
    const newId = eventData.id || Math.random().toString(36).substr(2, 9);
    const newEvent: AppEvent = {
      ...eventData,
      id: newId,
      photos: eventData.photos || []
    };
    setEvents([newEvent, ...events]);
    return newId;
  };

  const loadEvents = (apiEvents: ApiEvent[]) => {
    setEvents(apiEvents.map(e => ({
      id: e.id,
      name: e.name,
      type: (e.type as AppEvent['type']) || 'Other',
      date: e.date,
      startDate: e.startDate || undefined,
      endDate: e.endDate || undefined,
      location: e.location,
      coverImage: e.coverImage,
      photos: [],
    })));
  };

  const mergeEvents = (event1Id: string, event2Id: string, newName: string) => {
    const e1 = events.find(e => e.id === event1Id);
    const e2 = events.find(e => e.id === event2Id);
    if (!e1 || !e2) return;

    const mergedEvent: AppEvent = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      type: e1.type,
      date: e1.date,
      location: e1.location,
      coverImage: e1.coverImage,
      photos: [...e1.photos.map(p => ({...p, eventId: 'merged'})), ...e2.photos.map(p => ({...p, eventId: 'merged'}))]
    };

    setEvents(prev => [mergedEvent, ...prev.filter(e => e.id !== event1Id && e.id !== event2Id)]);
  };

  const addPhoto = (eventId: string, photoData: Omit<Photo, 'id' | 'eventId' | 'uploadedAt' | 'uploaderId'>) => {
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          photos: [...e.photos, {
            ...photoData,
            id: Math.random().toString(36).substr(2, 9),
            eventId,
            uploaderId: authUser?.uid || 'anonymous',
            uploadedAt: new Date().toISOString()
          }]
        };
      }
      return e;
    }));
  };

  const deletePhoto = (eventId: string, photoId: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          photos: e.photos.filter(p => p.id !== photoId)
        };
      }
      return e;
    }));
  };

  const deletePhotos = (eventId: string, photoIds: string[]) => {
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          photos: e.photos.filter(p => !photoIds.includes(p.id))
        };
      }
      return e;
    }));
  };

  const setEventPhotos = (eventId: string, photos: Photo[]) => {
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        return { ...e, photos };
      }
      return e;
    }));
  };

  const addLocalFolder = (folder: LocalFolder) => {
    setLocalFolders(prev => [folder, ...prev]);
  };

  const updatePhotoDetails = (eventId: string, photoId: string, details: Partial<Photo>) => {
    setEvents(prev => prev.map(event => {
      if (event.id !== eventId) return event;
      return {
        ...event,
        photos: event.photos.map(photo => {
          if (photo.id !== photoId) return photo;
          return { ...photo, ...details };
        })
      };
    }));
  };

  const updatePhotoClusters = (eventId: string, clusters: { clusterName: string; photoIds: string[]; detectedPeople?: Record<string, any[]>; visualTags?: Record<string, string[]> }[]) => {
    setEvents(prev => prev.map(event => {
      if (event.id !== eventId) return event;

      const updatedPhotos = event.photos.map(photo => {
        const cluster = clusters.find(c => c.photoIds.includes(photo.id));
        const people = clusters.find(c => c.detectedPeople?.[photo.id])?.detectedPeople?.[photo.id];
        const tags = clusters.find(c => c.visualTags?.[photo.id])?.visualTags?.[photo.id];

        if (cluster || people || tags) {
          return {
            ...photo,
            nameCluster: cluster?.clusterName || photo.nameCluster,
            detectedPeople: people || photo.detectedPeople,
            visualTags: tags || photo.visualTags
          };
        }
        return photo;
      });

      return { ...event, photos: updatedPhotos };
    }));
  };

  return (
    <AppContext.Provider value={{
      events,
      localFolders,
      addEvent,
      loadEvents,
      eventPasses,
      setEventPasses,
      autoUpload,
      setAutoUpload,
      autoUploadEvents,
      toggleAutoUploadForEvent,
      mergeEvents,
      addPhoto,
      deletePhoto,
      deletePhotos,
      setEventPhotos,
      updatePhotoDetails,
      addLocalFolder,
      updatePhotoClusters,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}