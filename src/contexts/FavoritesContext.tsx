import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NFTListing } from '../types/marketplace';

interface FavoritesContextType {
  favorites: NFTListing[];
  addToFavorites: (nft: NFTListing) => void;
  removeFromFavorites: (nftId: string) => void;
  isFavorite: (nftId: string) => boolean;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<NFTListing[]>([]);

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('nft-marketplace-favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error loading favorites from localStorage:', error);
      }
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    localStorage.setItem('nft-marketplace-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addToFavorites = (nft: NFTListing) => {
    setFavorites(prev => {
      if (!prev.find(fav => fav.id === nft.id)) {
        return [...prev, nft];
      }
      return prev;
    });
  };

  const removeFromFavorites = (nftId: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== nftId));
  };

  const isFavorite = (nftId: string) => {
    return favorites.some(fav => fav.id === nftId);
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const contextValue: FavoritesContextType = {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    clearFavorites,
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}