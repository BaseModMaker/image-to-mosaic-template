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
      // Calculate height to maintain aspect ratio
      const pixelHeight = calculateHeight(pixelWidth, img.width, img.height);

      // Set canvas size to match desired output dimensions
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;

      // Draw small image
      ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
      
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
    };

    img.src = imagePreview;
  }, [imagePreview, pixelWidth, colorCount, showGrid, quantizeColors, drawGrid, calculateHeight]);

  useEffect(() => {
    pixelateImage();
  }, [pixelateImage]);

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
    <div className="HomePage">
      <h1>Image to Mosaic Converter</h1>
      <div>
        <input
          type="file"
          accept=".png"
          id="imageUpload"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>
            Width (pixels):
            <input
              type="number"
              value={pixelWidth}
              onChange={(e) => setPixelWidth(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                marginLeft: '10px',
                padding: '5px',
                border: '1px solid #61dafb',
                borderRadius: '3px',
                width: '80px'
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
                border: '1px solid #61dafb',
                borderRadius: '3px',
                width: '80px'
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
        <button 
          onClick={() => document.getElementById('imageUpload').click()}
          className="App-link"
          style={{
            padding: '10px 20px',
            cursor: 'pointer',
            backgroundColor: '#282c34',
            border: '2px solid #61dafb',
            borderRadius: '5px',
            color: '#61dafb'
          }}
        >
          Upload PNG Image
        </button>
        
        {imagePreview && (
          <>
            {(scale > 1 || panX !== 0 || panY !== 0) && (
              <button 
                onClick={resetZoom}
                style={{
                  marginTop: '10px',
                  marginBottom: '10px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  backgroundColor: '#282c34',
                  border: '2px solid #61dafb',
                  borderRadius: '5px',
                  color: '#61dafb'
                }}
              >
                Reset Zoom
              </button>
            )}
            <div style={{ marginTop: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <div>
                <h3>Original Image</h3>
                <div
                  style={{
                    width: '400px',
                    height: '33vh',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '2px solid #61dafb',
                    borderRadius: '5px'
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
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      maxHeight: '33vh',
                      width: 'auto',
                      transform: `translate(-50%, -50%) scale(${scale}) translate(${panX}px, ${panY}px)`,
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
                    width: '400px',
                    height: '33vh',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '2px solid #61dafb',
                    borderRadius: '5px'
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
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      maxHeight: '33vh',
                      width: 'auto',
                      transform: `translate(-50%, -50%) scale(${scale}) translate(${panX}px, ${panY}px)`,
                      transformOrigin: 'center',
                      cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HomePage;