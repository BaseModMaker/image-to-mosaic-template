import React from 'react';
import { useMosaicLogic } from '../hooks/useMosaicLogic';
import ColorCard from './ColorCard';  // Add this import

function HomePage() {
  const {
    imagePreview,
    pixelWidth,
    colorCount,
    showGrid,
    canvasRef,
    scale,
    panX,
    panY,
    isDragging,
    originalImageRef,
    selectedColors,
    darkMode,
    containerDimensions,
    showColorNumbers,
    tileSize,
    tileSizeUnit,
    tileCost,
    tileCostPer,
    currency,
    outputUnit,
    setPixelWidth,
    setColorCount,
    setShowGrid,
    setShowColorNumbers,
    setDarkMode,
    setTileSize,
    setTileSizeUnit,
    setTileCost,
    setTileCostPer,
    setCurrency,
    setOutputUnit,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoom,
    handleDownload,
    handleImageUpload,
    getFitDimensions,
    formatSize,
    formatArea,
    formatCost,
    getTotalTiles,
    handleColorChange
  } = useMosaicLogic();

  return (
    <div className="HomePage" style={{ 
      backgroundColor: darkMode ? '#282c34' : '#ffffff',
      color: darkMode ? '#61dafb' : '#282c34',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', // Changed from space-between to center
        alignItems: 'center',
        marginBottom: '20px',
        position: 'relative' // Added to help with absolute positioning
      }}>
        <h1 style={{ margin: 0 }}>Image to Mosaic Template Converter</h1>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            padding: '5px 10px',
            cursor: 'pointer',
            backgroundColor: darkMode ? '#ffffff' : '#282c34',
            border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
            borderRadius: '5px',
            color: darkMode ? '#282c34' : '#61dafb',
            position: 'absolute', // Added to position the button
            right: 0 // Added to align to the right
          }}
        >
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
      
      {/* Update existing button styles */}
      <button 
        onClick={() => document.getElementById('imageUpload').click()}
        className="App-link"
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          cursor: 'pointer',
          backgroundColor: darkMode ? '#282c34' : '#ffffff',
          border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
          borderRadius: '5px',
          color: darkMode ? '#61dafb' : '#282c34'
        }}
      >
        Upload PNG Image
      </button>

      {/* Update input styles */}
      <input
        type="file"
        accept=".png"
        id="imageUpload"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>
          Pixels:
          <input
            type="number"
            value={pixelWidth}
            onChange={(e) => setPixelWidth(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              marginLeft: '10px',
              padding: '5px',
              border: `1px solid ${darkMode ? '#61dafb' : '#282c34'}`,
              borderRadius: '3px',
              width: '80px',
              backgroundColor: darkMode ? '#282c34' : '#ffffff',
              color: darkMode ? '#61dafb' : '#282c34'
            }}
          />
        </label>
        <label style={{ marginLeft: '20px' }}>
          Number of Colors:
          <input
            type="number"
            value={colorCount}
            onChange={(e) => setColorCount(Math.max(1, Math.min(256, parseInt(e.target.value) || 1)))}
            style={{
              marginLeft: '10px',
              padding: '5px',
              border: `1px solid ${darkMode ? '#61dafb' : '#282c34'}`,
              borderRadius: '3px',
              width: '80px',
              backgroundColor: darkMode ? '#282c34' : '#ffffff',
              color: darkMode ? '#61dafb' : '#282c34'
            }}
          />
        </label>
        <label style={{ marginLeft: '20px' }}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => {
              setShowGrid(e.target.checked);
              if (!e.target.checked) {
                setShowColorNumbers(false);
              }
            }}
            style={{ marginRight: '5px' }}
          />
          Show Grid
        </label>
        {showGrid && (
          <label style={{ marginLeft: '20px' }}>
            <input
              type="checkbox"
              checked={showColorNumbers}
              onChange={(e) => setShowColorNumbers(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Show Color Numbers
          </label>
        )}
      </div>
      
      {imagePreview && (
        <>
          <div style={{ marginTop: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <div>
              <h3>Original Image</h3>
              <div
                style={{
                  width: `${containerDimensions.width}px`,
                  height: `${containerDimensions.height}px`,
                  overflow: 'hidden',
                  position: 'relative',
                  border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
                  borderRadius: '5px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img 
                  src={imagePreview} 
                  alt="Original" 
                  style={{
                    ...getFitDimensions(
                      containerDimensions.width,
                      containerDimensions.height,
                      originalImageRef.current?.naturalWidth || containerDimensions.width,
                      originalImageRef.current?.naturalHeight || containerDimensions.height
                    ),
                    objectFit: 'contain',
                    transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
                    transformOrigin: 'center',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                  ref={originalImageRef}
                />
              </div>
            </div>
            <div>
              <h3>Mosaic Template Preview</h3>
              <div
                style={{
                  width: `${containerDimensions.width}px`,
                  height: `${containerDimensions.height}px`,
                  overflow: 'hidden',
                  position: 'relative',
                  border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
                  borderRadius: '5px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    ...getFitDimensions(
                      containerDimensions.width,
                      containerDimensions.height,
                      originalImageRef.current?.naturalWidth || containerDimensions.width,
                      originalImageRef.current?.naturalHeight || containerDimensions.height
                    ),
                    objectFit: 'contain',
                    transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
                    transformOrigin: 'center',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', gap: '10px' }}>
            {(scale > 1 || panX !== 0 || panY !== 0) && (
              <button 
                onClick={resetZoom}
                style={{
                  padding: '5px 10px',
                  cursor: 'pointer',
                  backgroundColor: darkMode ? '#282c34' : '#ffffff',
                  border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
                  borderRadius: '5px',
                  color: darkMode ? '#61dafb' : '#282c34'
                }}
              >
                Reset Zoom
              </button>
            )}
            <button 
              onClick={handleDownload}
              style={{
                padding: '5px 10px',
                cursor: 'pointer',
                backgroundColor: darkMode ? '#282c34' : '#ffffff',
                border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
                borderRadius: '5px',
                color: darkMode ? '#61dafb' : '#282c34'
              }}
            >
              Download Template
            </button>
          </div>
        </>
      )}
      {imagePreview && selectedColors.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}>
          <h3>Color Palette</h3>
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            maxWidth: '800px'
          }}>
            {selectedColors.map((color, index) => (
              <ColorCard
                key={color.hex}
                color={color}
                index={index}
                darkMode={darkMode}
                onColorChange={handleColorChange}
              />
            ))}
          </div>

          <div style={{ 
            marginTop: '20px', 
            padding: '10px',
            border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
            borderRadius: '5px',
            backgroundColor: darkMode ? '#1e2127' : '#f0f0f0',
            width: '100%',
            maxWidth: '800px'
          }}>
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>Mosaic Statistics</h3>
            
            {/* Size Configuration */}
            <div style={{ marginBottom: '15px', display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <label>
                Tile size:
                <input
                  type="number"
                  value={tileSize}
                  onChange={(e) => setTileSize(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  style={{
                    width: '60px',
                    marginLeft: '5px',
                    marginRight: '5px',
                    padding: '3px'
                  }}
                />
                <select
                  value={tileSizeUnit}
                  onChange={(e) => setTileSizeUnit(e.target.value)}
                  style={{ padding: '3px' }}
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                  <option value="inch">inch</option>
                </select>
              </label>

              <label>
                Cost per
                <input
                  type="number"
                  value={tileCostPer}
                  onChange={(e) => setTileCostPer(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '60px',
                    marginLeft: '5px',
                    marginRight: '5px',
                    padding: '3px'
                  }}
                />
                tiles:
                <input
                  type="number"
                  value={tileCost}
                  onChange={(e) => setTileCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '60px',
                    marginLeft: '5px',
                    marginRight: '5px',
                    padding: '3px'
                  }}
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ padding: '3px' }}
                >
                  <option value="€">EUR (€)</option>
                  <option value="$">USD ($)</option>
                  <option value="£">GBP (£)</option>
                </select>
              </label>
            </div>
          
            {/* Statistics Table */}
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              color: darkMode ? '#61dafb' : '#282c34'
            }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${darkMode ? '#61dafb' : '#282c34'}` }}>Metric</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: `1px solid ${darkMode ? '#61dafb' : '#282c34'}` }}>Tiles</th>
                  <th style={{ 
                    padding: '8px', 
                    textAlign: 'right', 
                    borderBottom: `1px solid ${darkMode ? '#61dafb' : '#282c34'}`,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    Size in
                    <select
                      value={outputUnit}
                      onChange={(e) => setOutputUnit(e.target.value)}
                      style={{ 
                        padding: '2px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${darkMode ? '#61dafb' : '#282c34'}`,
                        color: darkMode ? '#61dafb' : '#282c34',
                        borderRadius: '3px'
                      }}
                    >
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                      <option value="inch">inch</option>
                    </select>
                  </th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: `1px solid ${darkMode ? '#61dafb' : '#282c34'}` }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px' }}>Width</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{pixelWidth}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {formatSize(pixelWidth * tileSize, tileSizeUnit, outputUnit)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px' }}>Height</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {Math.round(pixelWidth * (originalImageRef.current?.naturalHeight || 0) / (originalImageRef.current?.naturalWidth || 1))}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {formatSize(Math.round(pixelWidth * (originalImageRef.current?.naturalHeight || 0) / (originalImageRef.current?.naturalWidth || 1)) * tileSize, tileSizeUnit, outputUnit)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px' }}>Total</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {getTotalTiles()}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {formatArea(getTotalTiles() * tileSize * tileSize, tileSizeUnit, outputUnit)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {formatCost(getTotalTiles() * (tileCost / tileCostPer), currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;