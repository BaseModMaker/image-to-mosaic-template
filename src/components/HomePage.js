import React, { useState, useEffect, useRef, useCallback } from 'react';

function HomePage() {
  const [imagePreview, setImagePreview] = useState(null);
  const [pixelWidth, setPixelWidth] = useState(32);
  const [colorCount, setColorCount] = useState(6);
  const [showGrid, setShowGrid] = useState(false);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const originalImageRef = useRef(null);
  const [selectedColors, setSelectedColors] = useState([]);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [containerDimensions, setContainerDimensions] = useState({ width: 400, height: 0 });
  // Add new state for showing color numbers
  const [showColorNumbers, setShowColorNumbers] = useState(false);
  // Add these state variables at the top of the component
  const [tileSize, setTileSize] = useState(10);
  const [tileSizeUnit, setTileSizeUnit] = useState('mm');
  const [tileCost, setTileCost] = useState(5);
  const [tileCostPer, setTileCostPer] = useState(100);
  const [currency, setCurrency] = useState('€');
  // Add new state for output unit
  const [outputUnit, setOutputUnit] = useState('mm');

  // Add this function at the top of HomePage component
  const getFitDimensions = useCallback((containerWidth, containerHeight, imageWidth, imageHeight) => {
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = imageWidth / imageHeight;
  
    if (imageRatio > containerRatio) {
      // Image is wider than container ratio
      return {
        width: containerWidth,
        height: containerWidth / imageRatio
      };
    } else {
      // Image is taller than container ratio
      return {
        width: containerHeight * imageRatio,
        height: containerHeight
      };
    }
  }, []);

  const quantizeColors = useCallback((imageData, numColors) => {
    const pixels = [];
    const alphaValues = [];
    const pixelIndices = [];
    let clusters; // Declare clusters at function scope
  
    // Collect non-transparent pixels
    for (let i = 0; i < imageData.data.length; i += 4) {
      const alpha = imageData.data[i + 3];
      alphaValues.push(alpha);
      
      if (alpha > 0) {
        pixels.push([
          imageData.data[i],
          imageData.data[i + 1],
          imageData.data[i + 2]
        ]);
        pixelIndices.push(i / 4);
      }
    }
  
    if (pixels.length === 0) return imageData;
  
    let centroids = pixels
      .slice(0, Math.min(numColors, pixels.length))
      .map(pixel => [...pixel]);
  
    // Helper function to find nearest centroid
    const findNearestCentroid = (pixel, centroids) => {
      let minDist = Infinity;
      let nearestIndex = 0;
      
      centroids.forEach((centroid, i) => {
        const dist = Math.sqrt(
          Math.pow(pixel[0] - centroid[0], 2) +
          Math.pow(pixel[1] - centroid[1], 2) +
          Math.pow(pixel[2] - centroid[2], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIndex = i;
        }
      });
      
      return nearestIndex;
    };

    const updateCentroids = (clusters, pixels, centroids) => {
      return clusters.map((cluster, i) => {
        if (cluster.length === 0) return centroids[i];
        
        const newCentroid = [0, 0, 0];
        cluster.forEach(pixelIndex => {
          const pixel = pixels[pixelIndex];
          newCentroid[0] += pixel[0];
          newCentroid[1] += pixel[1];
          newCentroid[2] += pixel[2];
        });
        return newCentroid.map(sum => Math.round(sum / cluster.length));
      });
    };

    // New function to assign pixels to clusters
    const assignPixelsToClusters = (pixels, centroids, numColors) => {
      const clusters = Array(numColors).fill().map(() => []);
      
      pixels.forEach((pixel, index) => {
        const nearestIndex = findNearestCentroid(pixel, centroids);
        clusters[nearestIndex].push(index);
      });
  
      return clusters;
    };

    // K-means clustering
    for (let iteration = 0; iteration < 10; iteration++) {
      // Use the new function instead of declaring inside loop
      clusters = assignPixelsToClusters(pixels, centroids, numColors);
      centroids = updateCentroids(clusters, pixels, centroids);
    }
  
    // Count color frequencies using the final clusters
    const colorCounts = new Map();
    clusters.forEach((cluster, i) => {
      const centroid = centroids[i];
      const key = `${centroid[0]},${centroid[1]},${centroid[2]}`;
      colorCounts.set(key, cluster.length);
    });
  
    // Apply colors and update selected colors
    const colorIndices = new Array(pixels.length);
    pixels.forEach((pixel, i) => {
      let nearestCentroid = centroids[0];
      let minDist = Infinity;
      
      centroids.forEach((centroid, index) => {
        const dist = Math.sqrt(
          Math.pow(pixel[0] - centroid[0], 2) +
          Math.pow(pixel[1] - centroid[1], 2) +
          Math.pow(pixel[2] - centroid[2], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestCentroid = centroid;
          colorIndices[i] = index;
        }
      });
      
      const originalIndex = pixelIndices[i] * 4;
      imageData.data[originalIndex] = nearestCentroid[0];
      imageData.data[originalIndex + 1] = nearestCentroid[1];
      imageData.data[originalIndex + 2] = nearestCentroid[2];
      imageData.data[originalIndex + 3] = alphaValues[pixelIndices[i]];
    });
  
    setSelectedColors(centroids.map(color => {
      const key = `${color[0]},${color[1]},${color[2]}`;
      return {
        r: color[0],
        g: color[1],
        b: color[2],
        count: colorCounts.get(key) || 0,
        hex: `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`
      };
    }));
  
    return { processedImageData: imageData, colorIndices };
  }, []);

  const drawGrid = useCallback((ctx, width, height, colorIndices) => {
    const PADDING = 20; // Space for numbers
    const imageWidth = ctx.canvas.width - (PADDING * 2);
    const imageHeight = ctx.canvas.height - (PADDING * 2);
    const cellWidth = imageWidth / width;
    const cellHeight = imageHeight / height;
    
    // Calculate font size based on cell size
    const fontSize = Math.min(
      10, // Maximum font size
      Math.max(6, // Minimum font size
        Math.floor(Math.min(cellWidth, cellHeight) / 3)
      )
    );
    
    ctx.save(); // Save the current state
    ctx.translate(PADDING, PADDING); // Move the grid to make space for labels
    
    // Draw vertical lines and column numbers
    for (let i = 0; i <= width; i++) {
      const x = i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, imageHeight);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.stroke();
      
      // Draw column numbers vertically on top
      if (i < width && showGrid) {
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        // Position and rotate text above grid
        ctx.translate(x + cellWidth/2, -2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${i + 1}`, 0, 0);
        ctx.restore();
      }
    }
    
    // Draw horizontal lines and row numbers
    for (let i = 0; i <= height; i++) {
      const y = i * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(imageWidth, y);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.stroke();
      
      // Draw row numbers on left (unchanged)
      if (i < height && showGrid) {
        ctx.fillStyle = 'black';
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, -2, y + cellHeight/2);
      }
    }

    if (showColorNumbers && colorIndices) {
      ctx.font = `${Math.min(cellWidth * 0.5, cellHeight * 0.5, 12)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const colorIndex = colorIndices[y * width + x];
          if (colorIndex !== undefined) {
            const centerX = x * cellWidth + cellWidth / 2;
            const centerY = y * cellHeight + cellHeight / 2;
            
            // Add white background for better visibility
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            const textWidth = ctx.measureText(colorIndex + 1).width;
            ctx.fillRect(
              centerX - textWidth/2 - 2,
              centerY - fontSize/2 - 2,
              textWidth + 4,
              fontSize + 4
            );
            
            ctx.fillStyle = 'black';
            ctx.fillText(colorIndex + 1, centerX, centerY);
          }
        }
      }
    }
    
    ctx.restore(); // Restore the original state
  }, [showGrid, showColorNumbers]); // Only depends on showGrid state

  const calculateHeight = useCallback((width, originalWidth, originalHeight) => {
    return Math.round((width * originalHeight) / originalWidth);
  }, []);

  const pixelateImage = useCallback(() => {
    if (!imagePreview) return;
  
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
  
    img.onload = () => {
      // Ensure we have valid dimensions
      if (img.width === 0 || img.height === 0) {
        console.error('Invalid image dimensions');
        return;
      }
  
      // Calculate height to maintain aspect ratio
      const pixelHeight = Math.max(1, calculateHeight(pixelWidth, img.width, img.height));
  
      // Set canvas size to match desired output dimensions
      canvas.width = Math.max(1, pixelWidth);
      canvas.height = Math.max(1, pixelHeight);
  
      // Draw small image
      ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
      
      try {
        // Get the scaled-down image data
        let imageData = ctx.getImageData(0, 0, pixelWidth, pixelHeight);
        const { processedImageData, colorIndices } = quantizeColors(imageData, colorCount);
        imageData = processedImageData;
        
        // Clear canvas and resize it to match original image dimensions
        const PADDING = showGrid ? 20 : 0;
        canvas.width = img.width + (PADDING * 2);
        canvas.height = img.height + (PADDING * 2);
        
        // Disable smoothing for pixelated look
        ctx.imageSmoothingEnabled = false;
        
        // Create temporary canvas for the small image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pixelWidth;
        tempCanvas.height = pixelHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        // Draw the final scaled-up image with padding offset
        ctx.drawImage(
          tempCanvas,
          0, 0, pixelWidth, pixelHeight,
          PADDING, PADDING, img.width, img.height
        );
  
        if (showGrid || showColorNumbers) {
          drawGrid(ctx, pixelWidth, pixelHeight, colorIndices);
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    };
  
    img.src = imagePreview;
  }, [imagePreview, pixelWidth, colorCount, showGrid, showColorNumbers, quantizeColors, drawGrid, calculateHeight]);
  

  useEffect(() => {
    pixelateImage();
  }, [pixelateImage]);

  useEffect(() => {
    setContainerDimensions({
      width: 400,
      height: window.innerHeight * 0.33 // 33vh in pixels
    });
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "image/png") {
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
      console.log("PNG file selected:", file.name);
    } else {
      alert("Please select a PNG file");
    }
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY;
    const zoomFactor = 0.1;
    // Changed the sign in the delta calculation
    const newScale = Math.min(Math.max(scale + (delta > 0 ? -zoomFactor : zoomFactor), 1), 5);
    
    // Adjust pan to zoom toward cursor position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleChange = newScale - scale;
    setPanX(panX - (x - rect.width/2) * (scaleChange) / scale);
    setPanY(panY - (y - rect.height/2) * (scaleChange) / scale);
    setScale(newScale);
  }, [scale, panX, panY]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panX,
      y: e.clientY - panY
    });
  }, [panX, panY]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  };

  const convertSize = (value, fromUnit, toUnit) => {
    // First convert to mm
    let inMm = value;
    switch (fromUnit) {
      case 'cm':
        inMm = value * 10;
        break;
      case 'm':
        inMm = value * 1000;
        break;
      case 'inch':
        inMm = value * 25.4;
        break;
      default:
        // If unit is mm or unknown, keep the value as is
        inMm = value;
        break;
    }
    
    // Then convert to target unit
    switch (toUnit) {
      case 'mm':
        return inMm;
      case 'cm':
        return inMm / 10;
      case 'm':
        return inMm / 1000;
      case 'inch':
        return inMm / 25.4;
      default:
        // If unit is unknown, return the value in mm
        return inMm;
    }
  };
  
  const formatSize = (value, fromUnit, toUnit) => {
    const converted = convertSize(value, fromUnit, toUnit);
    switch (toUnit) {
      case 'mm':
        return `${converted.toFixed(1)} mm`;
      case 'cm':
        return `${converted.toFixed(1)} cm`;
      case 'm':
        return `${converted.toFixed(2)} m`;
      case 'inch':
        return `${converted.toFixed(1)} in`;
      default:
        return `${converted.toFixed(1)} ${toUnit}`;
    }
  };
  
  const formatArea = (value, fromUnit, toUnit) => {
    const converted = convertSize(value, fromUnit, toUnit);
    switch (toUnit) {
      case 'mm':
        return `${converted.toFixed(0)} mm²`;
      case 'cm':
        return `${converted.toFixed(1)} cm²`;
      case 'm':
        return `${converted.toFixed(2)} m²`;
      case 'inch':
        return `${converted.toFixed(1)} in²`;
      default:
        return `${converted.toFixed(1)} ${toUnit}²`;
    }
  };

  const formatCost = (value, currency) => {
    return `${currency}${value.toFixed(2)}`;
  };

  const getTotalTiles = () => {
    return pixelWidth * Math.round(pixelWidth * (originalImageRef.current?.naturalHeight || 0) / (originalImageRef.current?.naturalWidth || 1));
  };

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
        <h1 style={{ margin: 0 }}>Image to Mosaic Converter</h1>
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
              <h3>Pixelated Preview</h3>
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
          {(scale > 1 || panX !== 0 || panY !== 0) && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
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
            </div>
          )}
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
              <div
                key={color.hex}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: color.hex,
                      border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
                      borderRadius: '5px'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    backgroundColor: darkMode ? '#61dafb' : '#282c34',
                    color: darkMode ? '#282c34' : '#ffffff',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '12px'
                  }}>
                    {index + 1}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: darkMode ? '#61dafb' : '#282c34' }}>
                  {color.hex.toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', color: darkMode ? '#61dafb' : '#282c34' }}>
                  RGB({color.r}, {color.g}, {color.b})
                </div>
                <div style={{ fontSize: '12px', color: darkMode ? '#61dafb' : '#282c34' }}>
                  {color.count} tiles
                </div>
              </div>
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
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>Image Statistics</h3>
            
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
                Output unit:
                <select
                  value={outputUnit}
                  onChange={(e) => setOutputUnit(e.target.value)}
                  style={{ padding: '3px', marginLeft: '5px' }}
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
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: `1px solid ${darkMode ? '#61dafb' : '#282c34'}` }}>Size</th>
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