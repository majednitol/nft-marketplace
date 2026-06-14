import React, { useMemo, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { NFTListing } from '../../types/marketplace';
import { NFTCard } from './NFTCard';
import { useIsMobile } from '../mobile/MobileOptimizations';

interface VirtualizedNFTGridProps {
  nfts: NFTListing[];
  onBuy?: (nft: NFTListing) => void;
  onList?: (nft: NFTListing) => void;
  onDelist?: (nft: NFTListing) => void;
  height: number;
  isOwned?: boolean;
}

interface GridCellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    nfts: NFTListing[];
    columnCount: number;
    onBuy?: (nft: NFTListing) => void;
    onList?: (nft: NFTListing) => void;
    onDelist?: (nft: NFTListing) => void;
    isOwned?: boolean;
  };
}

const GridCell = React.memo<GridCellProps>(({ columnIndex, rowIndex, style, data }) => {
  const { nfts, columnCount, onBuy, onList, onDelist, isOwned } = data;
  const index = rowIndex * columnCount + columnIndex;
  const nft = nfts[index];

  if (!nft) {
    return <div style={style} />;
  }

  return (
    <div style={style} className="p-2">
      <NFTCard
        nft={nft}
        onBuy={onBuy}
        onList={onList}
        onDelist={onDelist}
        isOwned={isOwned}
      />
    </div>
  );
});

export const VirtualizedNFTGrid = React.memo<VirtualizedNFTGridProps>(({
  nfts,
  onBuy,
  onList,
  onDelist,
  height,
  isOwned = false,
}) => {
  const isMobile = useIsMobile();
  
  // Calculate grid dimensions based on screen size
  const { columnCount, columnWidth, rowHeight } = useMemo(() => {
    if (isMobile) {
      return {
        columnCount: 1,
        columnWidth: window.innerWidth - 32, // Account for padding
        rowHeight: 460, // Height for mobile cards
      };
    } else {
      const minCardWidth = 280;
      const availableWidth = Math.max(window.innerWidth - 200, 800); // Account for sidebar
      const cols = Math.floor(availableWidth / (minCardWidth + 16)); // 16px for gap
      const colCount = Math.max(cols, 1);
      const colWidth = Math.floor(availableWidth / colCount);
      
      return {
        columnCount: colCount,
        columnWidth: colWidth,
        rowHeight: 420, // Height for desktop cards
      };
    }
  }, [isMobile]);

  const rowCount = Math.ceil(nfts.length / columnCount);

  // Memoize grid data to prevent unnecessary re-renders
  const gridData = useMemo(() => ({
    nfts,
    columnCount,
    onBuy,
    onList,
    onDelist,
    isOwned,
  }), [nfts, columnCount, onBuy, onList, onDelist, isOwned]);

  // Handle grid resize
  const handleResize = useCallback(() => {
    // Grid will automatically handle resize through window size changes
  }, []);

  if (nfts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-2">No NFTs found</p>
          <p className="text-gray-500 text-sm">
            {isOwned ? 'You don\'t own any NFTs yet.' : 'Try adjusting your filters or check back later.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={height}
        rowCount={rowCount}
        rowHeight={rowHeight}
        itemData={gridData}
        overscanRowCount={2} // Pre-render 2 rows above and below visible area
        overscanColumnCount={1} // Pre-render 1 column left and right
        width="100%"
      >
        {GridCell}
      </Grid>
    </div>
  );
});

VirtualizedNFTGrid.displayName = 'VirtualizedNFTGrid';