import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { NFTListing } from '../../types/marketplace';
import { NFTCard } from '../nft/NFTCard';
import { enhancedToast } from '../notifications/EnhancedToast';
import { Move, Grid, List, Bookmark, Archive, ShoppingCart } from 'lucide-react';

interface DraggableNFTGridProps {
  nfts: NFTListing[];
  onReorder?: (reorderedNFTs: NFTListing[]) => void;
  onMoveToCollection?: (nft: NFTListing, collection: string) => void;
  onBuy?: (nft: NFTListing) => void;
  onList?: (nft: NFTListing) => void;
  onDelist?: (nft: NFTListing) => void;
  collections?: string[];
  enableReordering?: boolean;
  enableCollectionMove?: boolean;
  showDropZones?: boolean;
}

interface DropZone {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: (nft: NFTListing) => void;
}

export const DraggableNFTGrid: React.FC<DraggableNFTGridProps> = ({
  nfts,
  onReorder,
  onMoveToCollection,
  onBuy,
  onList,
  onDelist,
  collections = [],
  enableReordering = true,
  enableCollectionMove = false,
  showDropZones = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<NFTListing | null>(null);

  // Create drop zones based on available actions
  const dropZones: DropZone[] = [
    {
      id: 'favorites',
      label: 'Add to Favorites',
      icon: Bookmark,
      color: 'border-yellow-500 bg-yellow-500/10',
      action: (nft) => {
        enhancedToast.success('Added to Favorites', {
          message: `${nft.metadata.name} has been added to your favorites`,
        });
      },
    },
    {
      id: 'watchlist',
      label: 'Add to Watchlist',
      icon: List,
      color: 'border-blue-500 bg-blue-500/10',
      action: (nft) => {
        enhancedToast.success('Added to Watchlist', {
          message: `${nft.metadata.name} is now being watched for price changes`,
        });
      },
    },
  ];

  // Add collection drop zones if enabled
  if (enableCollectionMove && collections.length > 0) {
    collections.forEach(collection => {
      dropZones.push({
        id: `collection-${collection}`,
        label: `Move to ${collection}`,
        icon: Grid,
        color: 'border-primary-500 bg-primary-500/10',
        action: (nft) => {
          onMoveToCollection?.(nft, collection);
          enhancedToast.success('Moved to Collection', {
            message: `${nft.metadata.name} moved to ${collection}`,
          });
        },
      });
    });
  }

  // Add marketplace action zones
  if (onList) {
    dropZones.push({
      id: 'list-for-sale',
      label: 'List for Sale',
      icon: ShoppingCart,
      color: 'border-green-500 bg-green-500/10',
      action: (nft) => {
        onList(nft);
      },
    });
  }

  if (onDelist) {
    dropZones.push({
      id: 'remove-listing',
      label: 'Remove Listing',
      icon: Archive,
      color: 'border-red-500 bg-red-500/10',
      action: (nft) => {
        onDelist(nft);
      },
    });
  }

  const handleDragStart = useCallback((start: any) => {
    setIsDragging(true);
    const draggedNFT = nfts.find(nft => nft.id === start.draggableId);
    setDraggedItem(draggedNFT || null);
    
    // Add visual feedback
    document.body.style.cursor = 'grabbing';
    
    // Announce to screen readers
    const announcement = `Started dragging ${draggedNFT?.metadata.name}`;
    const liveRegion = document.getElementById('drag-announcements');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  }, [nfts]);

  const handleDragEnd = useCallback((result: DropResult) => {
    setIsDragging(false);
    setDraggedItem(null);
    document.body.style.cursor = '';

    const { destination, source, draggableId } = result;

    // No destination or dropped in same position
    if (!destination || (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )) {
      return;
    }

    const draggedNFT = nfts.find(nft => nft.id === draggableId);
    if (!draggedNFT) return;

    // Handle drop zone actions
    if (destination.droppableId !== 'nft-grid') {
      const dropZone = dropZones.find(zone => zone.id === destination.droppableId);
      if (dropZone) {
        dropZone.action(draggedNFT);
      }
      return;
    }

    // Handle reordering within grid
    if (enableReordering && destination.droppableId === 'nft-grid') {
      const reorderedNFTs = Array.from(nfts);
      const [movedNFT] = reorderedNFTs.splice(source.index, 1);
      reorderedNFTs.splice(destination.index, 0, movedNFT);
      
      onReorder?.(reorderedNFTs);
      
      enhancedToast.success('NFTs Reordered', {
        message: `${draggedNFT.metadata.name} moved to position ${destination.index + 1}`,
      });
    }

    // Announce completion to screen readers
    const announcement = `Moved ${draggedNFT.metadata.name} to new position`;
    const liveRegion = document.getElementById('drag-announcements');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  }, [nfts, enableReordering, onReorder, dropZones]);

  return (
    <div className="space-y-6">
      {/* Screen reader announcements */}
      <div
        id="drag-announcements"
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
      />

      {/* Instructions */}
      <div className="bg-dark-700/50 rounded-lg p-4 border border-primary-800/30">
        <div className="flex items-center space-x-2 text-primary-400 mb-2">
          <Move className="h-4 w-4" />
          <span className="text-sm font-medium">Drag & Drop</span>
        </div>
        <p className="text-gray-300 text-sm">
          {enableReordering && 'Drag NFTs to reorder them within your collection. '}
          {showDropZones && 'Drop NFTs on the zones below to perform quick actions.'}
        </p>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Drop Zones */}
        {showDropZones && dropZones.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {dropZones.map((zone) => (
              <Droppable key={zone.id} droppableId={zone.id} type="NFT">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
                      ${snapshot.isDraggingOver 
                        ? `${zone.color} border-solid scale-105` 
                        : 'border-gray-600 bg-dark-400/20'
                      }
                      ${isDragging ? 'opacity-100' : 'opacity-60'}
                    `}
                    role="region"
                    aria-label={`Drop zone: ${zone.label}`}
                  >
                    <zone.icon className={`
                      h-8 w-8 mx-auto mb-2 transition-colors
                      ${snapshot.isDraggingOver ? 'text-white' : 'text-gray-400'}
                    `} />
                    <p className={`
                      text-sm font-medium transition-colors
                      ${snapshot.isDraggingOver ? 'text-white' : 'text-gray-400'}
                    `}>
                      {zone.label}
                    </p>
                    {snapshot.isDraggingOver && draggedItem && (
                      <p className="text-xs text-gray-300 mt-1">
                        Drop {draggedItem.metadata.name} here
                      </p>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        )}

        {/* NFT Grid */}
        <Droppable droppableId="nft-grid" type="NFT" direction="horizontal">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6
                transition-all duration-200
                ${snapshot.isDraggingOver && enableReordering ? 'bg-primary-500/5 rounded-xl p-4' : ''}
              `}
              role="grid"
              aria-label="NFT collection grid"
            >
              {nfts.map((nft, index) => (
                <Draggable key={nft.id} draggableId={nft.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={{
                        ...provided.draggableProps.style,
                        transform: snapshot.isDragging 
                          ? `${provided.draggableProps.style?.transform} rotate(5deg)`
                          : provided.draggableProps.style?.transform,
                      }}
                      className={`
                        transition-all duration-200 
                        ${snapshot.isDragging ? 'z-50 shadow-2xl scale-105' : ''}
                      `}
                      role="gridcell"
                      aria-label={`NFT: ${nft.metadata.name}`}
                    >
                      {/* Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className={`
                          absolute top-2 right-2 z-10 p-2 rounded-lg cursor-grab active:cursor-grabbing
                          transition-all duration-200
                          ${snapshot.isDragging 
                            ? 'bg-primary-600 text-white shadow-lg' 
                            : 'bg-dark-600/80 text-gray-400 hover:bg-dark-500 hover:text-white'
                          }
                          ${isDragging && !snapshot.isDragging ? 'opacity-50' : 'opacity-100'}
                        `}
                        aria-label={`Drag handle for ${nft.metadata.name}`}
                        title="Drag to reorder or move to collection"
                      >
                        <Move className="h-4 w-4" />
                      </div>

                      {/* NFT Card */}
                      <div className={`
                        ${snapshot.isDragging ? 'pointer-events-none' : ''}
                        ${isDragging && !snapshot.isDragging ? 'opacity-60' : 'opacity-100'}
                      `}>
                        <NFTCard
                          nft={nft}
                          onBuy={onBuy}
                          onList={onList}
                          onDelist={onDelist}
                        />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Empty state */}
      {nfts.length === 0 && (
        <div className="text-center py-12">
          <Grid className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No NFTs to display</h3>
          <p className="text-gray-400">
            Your NFTs will appear here once you add them to your collection.
          </p>
        </div>
      )}
    </div>
  );
};