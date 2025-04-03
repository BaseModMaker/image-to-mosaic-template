import { useState, useEffect, useRef, useCallback } from 'react';

export function useMosaicLogic() {
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
  const [darkMode, setDarkMode] = useState(true);
  const [containerDimensions, setContainerDimensions] = useState({ width: 400, height: 0 });
  const [showColorNumbers, setShowColorNumbers] = useState(false);
  const [tileSize, setTileSize] = useState(10);
  const [tileSizeUnit, setTileSizeUnit] = useState('mm');
  const [tileCost, setTileCost] = useState(5);
  const [tileCostPer, setTileCostPer] = useState(100);
  const [currency, setCurrency] = useState('€');
  const [outputUnit, setOutputUnit] = useState('mm');

  // Move all your existing utility functions and handlers here
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
  }, [showGrid, showColorNumbers]);

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
  
  // Add this new function before formatArea
const convertArea = (value, fromUnit, toUnit) => {
  // First convert to mm²
  let inMmSq;
  switch (fromUnit) {
    case 'cm':
      inMmSq = value * 100; // 1 cm² = 100 mm²
      break;
    case 'm':
      inMmSq = value * 1000000; // 1 m² = 1,000,000 mm²
      break;
    case 'inch':
      inMmSq = value * 645.16; // 1 in² = 645.16 mm²
      break;
    default:
      inMmSq = value;
      break;
  }
  
  // Then convert to target unit
  switch (toUnit) {
    case 'mm':
      return inMmSq;
    case 'cm':
      return inMmSq / 100;
    case 'm':
      return inMmSq / 1000000;
    case 'inch':
      return inMmSq / 645.16;
    default:
      return inMmSq;
  }
};

// Update the formatArea function to use convertArea
const formatArea = (value, fromUnit, toUnit) => {
  const converted = convertArea(value, fromUnit, toUnit);
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
  
  const formatCost = (value, currency) => {
    return `${currency}${value.toFixed(2)}`;
  };

  const getTotalTiles = () => {
    return pixelWidth * Math.round(pixelWidth * (originalImageRef.current?.naturalHeight || 0) / (originalImageRef.current?.naturalWidth || 1));
  };

  // Add after the other helper functions
  const generateHighResImage = useCallback(() => {
    if (!imagePreview) return null;
  
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
  
    return new Promise((resolve) => {
      img.onload = () => {
        const pixelHeight = Math.max(1, calculateHeight(pixelWidth, img.width, img.height));
        const scale = 8;
        const PADDING = (showGrid || showColorNumbers) ? 40 * scale : 0;
        
        const pixelSizeX = (img.width * scale) / pixelWidth;
        const pixelSizeY = (img.height * scale) / pixelHeight;
        
        canvas.width = (img.width * scale) + (PADDING * 2);
        canvas.height = (img.height * scale) + (PADDING * 2);
        
        ctx.imageSmoothingEnabled = false;
        
        // Draw and process the pixelated image
        const smallCanvas = document.createElement('canvas');
        smallCanvas.width = pixelWidth;
        smallCanvas.height = pixelHeight;
        const smallCtx = smallCanvas.getContext('2d');
        
        smallCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
        const { processedImageData, colorIndices } = quantizeColors(
          smallCtx.getImageData(0, 0, pixelWidth, pixelHeight),
          colorCount
        );
        smallCtx.putImageData(processedImageData, 0, 0);
        
        ctx.drawImage(
          smallCanvas,
          0, 0, pixelWidth, pixelHeight,
          PADDING, PADDING, img.width * scale, img.height * scale
        );
  
        if (showGrid || showColorNumbers) {
          ctx.save();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.translate(PADDING, PADDING);
  
          // Calculate font size based on cell size
          const fontSize = Math.min(
            scale * 2, // Maximum font size
            Math.max(scale, // Minimum font size
              Math.floor(Math.min(pixelSizeX, pixelSizeY) / 3)
            )
          );
  
          // Draw grid and numbers
          if (showGrid) {
            // Draw column numbers
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            for (let i = 0; i < pixelWidth; i++) {
              const x = i * pixelSizeX + pixelSizeX / 2;
              ctx.save();
              ctx.translate(x, -5);
              ctx.rotate(-Math.PI / 2);
              ctx.fillStyle = 'black';
              ctx.fillText(`${i + 1}`, 0, 0);
              ctx.restore();
            }
  
            // Draw row numbers
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let i = 0; i < pixelHeight; i++) {
              const y = i * pixelSizeY + pixelSizeY / 2;
              ctx.fillStyle = 'black';
              ctx.fillText(`${i + 1}`, -5, y);
            }
          }
  
          // Draw grid lines
          for (let i = 0; i <= pixelWidth; i++) {
            const x = i * pixelSizeX;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, img.height * scale);
            ctx.lineWidth = Math.max(2, scale / 4);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.stroke();
          }
  
          for (let i = 0; i <= pixelHeight; i++) {
            const y = i * pixelSizeY;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(img.width * scale, y);
            ctx.lineWidth = Math.max(2, scale / 4);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.stroke();
          }
  
          // Draw color numbers
          if (showColorNumbers && colorIndices) {
            const fontSize = Math.min(pixelSizeX * 0.5, pixelSizeY * 0.5);
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            for (let y = 0; y < pixelHeight; y++) {
              for (let x = 0; x < pixelWidth; x++) {
                const colorIndex = colorIndices[y * pixelWidth + x];
                if (colorIndex !== undefined) {
                  const centerX = x * pixelSizeX + pixelSizeX / 2;
                  const centerY = y * pixelSizeY + pixelSizeY / 2;
                  
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  const text = (colorIndex + 1).toString();
                  const textWidth = ctx.measureText(text).width;
                  ctx.fillRect(
                    centerX - textWidth/2 - 4,
                    centerY - fontSize/2 - 2,
                    textWidth + 8,
                    fontSize + 4
                  );
                  
                  ctx.fillStyle = 'black';
                  ctx.fillText(text, centerX, centerY);
                }
              }
            }
          }
          
          ctx.restore();
        }
  
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imagePreview;
    });
  }, [imagePreview, pixelWidth, colorCount, showGrid, showColorNumbers, quantizeColors, calculateHeight]);
  
  // Add download handler
  const handleDownload = useCallback(async () => {
    const dataUrl = await generateHighResImage();
    if (!dataUrl) return;
  
    const link = document.createElement('a');
    link.download = 'mosaic-template.png';
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generateHighResImage]);

  return {
    // State
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

    // Setters
    setImagePreview,
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

    // Handlers
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoom,
    handleDownload,
    handleImageUpload,

    // Utilities
    getFitDimensions,
    formatSize,
    formatArea,
    formatCost,
    getTotalTiles
  };
}