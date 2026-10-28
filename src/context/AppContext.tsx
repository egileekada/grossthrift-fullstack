'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Listing, JoinRequest, AppNotification, CreateListingInput } from '@/types/listing';
import {
  fetchListingsFromApi,
  saveStoredListings,
  getStoredUser,
  saveStoredUser,
  saveStoredJoinedIds,
  saveStoredJoinRequests,
  saveStoredNotifications,
} from '@/lib/api';
import { authApi, listingsApi } from '@/lib/httpService';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  listings: Listing[];
  setListings: React.Dispatch<React.SetStateAction<Listing[]>>;
  refreshListings: () => Promise<void>;
  joinedListingIds: string[];
  joinRequests: JoinRequest[];
  notifications: AppNotification[];
  selectedListing: Listing | null;
  setSelectedListing: (listing: Listing | null) => void;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  handleConfirmJoin: (listingId: string, userName: string, userEmail: string, userPhone: string) => Promise<void>;
  handleCreateListing: (listingData: CreateListingInput) => Promise<Listing | null>;
  handleUpdateJoinStatus: (requestId: string, status: 'approved' | 'rejected') => Promise<void>;
  handleDeleteJoinRequest: (requestId: string) => Promise<void>;
  handleMarkNotifAsRead: (id: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [joinedListingIds, setJoinedListingIds] = useState<string[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [theme] = useState<'light' | 'dark'>('dark');

  const refreshListings = useCallback(async () => {
    try {
      const res = await fetchListingsFromApi();
      setListings(res.listings);
      saveStoredListings(res.listings);

      if (res.joinedListingIds) {
        setJoinedListingIds(res.joinedListingIds);
        saveStoredJoinedIds(res.joinedListingIds);
      }
      if (res.joinRequests) {
        setJoinRequests(res.joinRequests);
        saveStoredJoinRequests(res.joinRequests);
      }
      if (res.notifications) {
        setNotifications(res.notifications);
        saveStoredNotifications(res.notifications);
      }
    } catch (err) {
      console.warn('Failed to fetch listings from API:', err);
    }
  }, []);

  // Hydrate real session and listings from backend API on mount
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');

    // Clear any legacy dummy data keys
    const storedUser = getStoredUser();
    if (storedUser) {
      setUserState(storedUser);
    }

    // Verify active server session
    authApi
      .getProfile()
      .then((res) => {
        if (res.user) {
          setUserState(res.user);
          saveStoredUser(res.user);
        }
      })
      .catch(() => {
        // Not signed in on server; clear stale local user
        setUserState(null);
        saveStoredUser(null);
      })
      .finally(() => {
        refreshListings();
      });
  }, [refreshListings]);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    saveStoredUser(newUser);
    refreshListings();
  };

  const toggleTheme = () => {
    // Locked to premium dark styling
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout API call failed:', e);
    }
    setUserState(null);
    saveStoredUser(null);
    setJoinedListingIds([]);
    saveStoredJoinedIds([]);
    setJoinRequests([]);
    saveStoredJoinRequests([]);
    setNotifications([]);
    saveStoredNotifications([]);
    await refreshListings();
  };

  const handleCreateListing = async (listingData: CreateListingInput): Promise<Listing | null> => {
    const res = await listingsApi.create(listingData);
    const created = res.data;

    setListings((prev) => {
      const updated = [created, ...prev.filter((l) => l.id !== created.id)];
      saveStoredListings(updated);
      return updated;
    });

    setJoinedListingIds((prev) => {
      const updated = prev.includes(created.id) ? prev : [...prev, created.id];
      saveStoredJoinedIds(updated);
      return updated;
    });

    return created;
  };

  const handleConfirmJoin = async (
    listingId: string,
    userName: string,
    userEmail: string,
    userPhone: string
  ) => {
    const res = await listingsApi.join(listingId, {
      userName,
      userEmail,
      userPhone,
    });

    const { listing: updatedListing, joinRequest, notification } = res.data;

    setListings((prev) => {
      const updated = prev.map((l) => (l.id === updatedListing.id ? updatedListing : l));
      saveStoredListings(updated);
      return updated;
    });

    setJoinRequests((prev) => {
      const updated = [joinRequest, ...prev.filter((r) => r.id !== joinRequest.id)];
      saveStoredJoinRequests(updated);
      return updated;
    });

    setJoinedListingIds((prev) => {
      const updated = prev.includes(listingId) ? prev : [...prev, listingId];
      saveStoredJoinedIds(updated);
      return updated;
    });

    if (notification) {
      setNotifications((prev) => {
        const updated = [notification, ...prev.filter((n) => n.id !== notification.id)];
        saveStoredNotifications(updated);
        return updated;
      });
    }
  };

  const handleMarkNotifAsRead = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveStoredNotifications(updated);
      return updated;
    });
    try {
      await listingsApi.markNotificationRead(id);
    } catch (e) {
      console.warn('Failed to mark notification read:', e);
    }
  };

  const handleUpdateJoinStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    const res = await listingsApi.updateRequestStatus(requestId, status);
    setJoinRequests((prev) => {
      const updated = prev.map((r) => (r.id === requestId ? res.data : r));
      saveStoredJoinRequests(updated);
      return updated;
    });
    if (res.listing) {
      setListings((prev) => {
        const updated = prev.map((l) => (l.id === res.listing!.id ? res.listing! : l));
        saveStoredListings(updated);
        return updated;
      });
    }
  };

  const handleDeleteJoinRequest = async (requestId: string) => {
    const res = await listingsApi.deleteRequestOrListing(requestId);
    await refreshListings();
    if (res.deletedListingId) {
      setListings((prev) => prev.filter((l) => l.id !== res.deletedListingId));
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        listings,
        setListings,
        refreshListings,
        joinedListingIds,
        joinRequests,
        notifications,
        selectedListing,
        setSelectedListing,
        isDetailModalOpen,
        setIsDetailModalOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        handleConfirmJoin,
        handleCreateListing,
        handleUpdateJoinStatus,
        handleDeleteJoinRequest,
        handleMarkNotifAsRead,
        handleLogout,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
