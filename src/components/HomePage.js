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
    for (let i = 0; i < imageData.data.length; i += 4) {
      pixels.push([
        imageData.data[i],     // R
        imageData.data[i + 1], // G
        imageData.data[i + 2]  // B
      ]);
    }

    // Simple k-means clustering for color quantization
    let centroids = pixels
      .slice(0, numColors)
      .map(pixel => [...pixel]);

    for (let iteration = 0; iteration < 10; iteration++) {
      const clusters = Array(numColors).fill().map(() => []);
      
      // Assign pixels to nearest centroid
      pixels.forEach((pixel, index) => {
        let minDist = Infinity;
        let nearestCentroid = 0;
        
        centroids.forEach((centroid, i) => {
          const dist = Math.sqrt(
            Math.pow(pixel[0] - centroid[0], 2) +
            Math.pow(pixel[1] - centroid[1], 2) +
            Math.pow(pixel[2] - centroid[2], 2)
          );
          if (dist < minDist) {
            minDist = dist;
            nearestCentroid = i;
          }
        });
        
        clusters[nearestCentroid].push(index);
      });
      
      // Update centroids
      clusters.forEach((cluster, i) => {
        if (cluster.length > 0) {
          const newCentroid = [0, 0, 0];
          cluster.forEach(pixelIndex => {
            const pixel = pixels[pixelIndex];
            newCentroid[0] += pixel[0];
            newCentroid[1] += pixel[1];
            newCentroid[2] += pixel[2];
          });
          centroids[i] = newCentroid.map(sum => Math.round(sum / cluster.length));
        }
      });
    }

    // Apply quantized colors back to image data
    pixels.forEach((pixel, i) => {
      let nearestCentroid = centroids[0];
      let minDist = Infinity;
      
      centroids.forEach(centroid => {
        const dist = Math.sqrt(
          Math.pow(pixel[0] - centroid[0], 2) +
          Math.pow(pixel[1] - centroid[1], 2) +
          Math.pow(pixel[2] - centroid[2], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestCentroid = centroid;
        }
      });
      
      const idx = i * 4;
      imageData.data[idx] = nearestCentroid[0];
      imageData.data[idx + 1] = nearestCentroid[1];
      imageData.data[idx + 2] = nearestCentroid[2];
    });

    setSelectedColors(centroids.map(color => ({
      r: color[0],
      g: color[1],
      b: color[2],
      hex: `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`
    })));

    return imageData;
  }, []); // No dependencies as this function doesn't use any external values

  const drawGrid = useCallback((ctx, width, height) => {
    const PADDING = 20; // Space for numbers
    const imageWidth = ctx.canvas.width - (PADDING * 2);
    const imageHeight = ctx.canvas.height - (PADDING * 2);
    const cellWidth = imageWidth / width;
    const cellHeight = imageHeight / height;
    
    ctx.save(); // Save the current state
    ctx.translate(PADDING, PADDING); // Move the grid to make space for labels
    
    // Draw vertical lines
    for (let i = 0; i <= width; i++) {
      const x = i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, imageHeight);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.stroke();
      
      // Draw column numbers on top
      if (i < width && showGrid) {
        ctx.fillStyle = 'black';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(i + 1, x + cellWidth/2, -5);
      }
    }
    
    // Draw horizontal lines
    for (let i = 0; i <= height; i++) {
      const y = i * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(imageWidth, y);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.stroke();
      
      // Draw row numbers on left
      if (i < height && showGrid) {
        ctx.fillStyle = 'black';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(i + 1, -5, y + cellHeight/2);
      }
    }
    
    ctx.restore(); // Restore the original state
  }, [showGrid]); // Only depends on showGrid state

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
        
        // Apply color quantization
        imageData = quantizeColors(imageData, colorCount);
        
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
  
        if (showGrid) {
          drawGrid(ctx, pixelWidth, pixelHeight);
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    };
  
    img.src = imagePreview;
  }, [imagePreview, pixelWidth, colorCount, showGrid, quantizeColors, drawGrid, calculateHeight]);
  

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
            onChange={(e) => setShowGrid(e.target.checked)}
            style={{ marginRight: '5px' }}
          />
          Show Grid
        </label>
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
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: color.hex,
                    border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
                    borderRadius: '5px'
                  }}
                />
                <div style={{ fontSize: '12px', color: darkMode ? '#61dafb' : '#282c34' }}>
                  {color.hex.toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', color: darkMode ? '#61dafb' : '#282c34' }}>
                  RGB({color.r}, {color.g}, {color.b})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;