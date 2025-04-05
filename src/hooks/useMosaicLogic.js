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
  const [colorIndices, setColorIndices] = useState(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState({
    includeGrid: showGrid,
    includeColorNumbers: showColorNumbers,
    includePalette: true,
    includeStats: true
  });

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

    setColorIndices(colorIndices); // Store colorIndices in state
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
        ctx.translate(x + cellWidth / 2, -2);
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
        ctx.fillText(i + 1, -2, y + cellHeight / 2);
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
              centerX - textWidth / 2 - 2,
              centerY - fontSize / 2 - 2,
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
    setPanX(panX - (x - rect.width / 2) * (scaleChange) / scale);
    setPanY(panY - (y - rect.height / 2) * (scaleChange) / scale);
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

  const convertSize = useCallback((value, fromUnit, toUnit) => {
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
  }, []);

  const convertArea = useCallback((value, fromUnit, toUnit) => {
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
  }, []);

  const formatArea = useCallback((value, fromUnit, toUnit) => {
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
  }, [convertArea]);

  const formatSize = useCallback((value, fromUnit, toUnit) => {
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
  }, [convertSize]);

  const formatCost = useCallback((value, currency) => {
    return `${currency}${value.toFixed(2)}`;
  }, []);

  const getTotalTiles = useCallback(() => {
    return pixelWidth * Math.round(pixelWidth * (originalImageRef.current?.naturalHeight || 0) / (originalImageRef.current?.naturalWidth || 1));
  }, [pixelWidth, originalImageRef]);

  const generateHighResImage = useCallback((options = {}) => {
    const { 
      includeGrid = showGrid, 
      includeColorNumbers = showColorNumbers,
      includePalette = false,
      includeStats = false
    } = options;
    
    if (!imagePreview) return null;
  
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
  
    return new Promise((resolve) => {
      img.onload = () => {
        const pixelHeight = Math.max(1, calculateHeight(pixelWidth, img.width, img.height));
        const scale = 8;
        const PADDING = (includeGrid || includeColorNumbers) ? 40 * scale : 0;
        
        // Calculate additional height for palette and stats
        let extraHeight = 0;
        if (includePalette) extraHeight += Math.max(300, Math.min(600, img.height * scale * 0.3)); // Larger, proportional space for palette
        if (includeStats) extraHeight += Math.max(200, Math.min(400, img.height * scale * 0.2)); // Larger, proportional space for stats
        
        canvas.width = (img.width * scale) + (PADDING * 2);
        canvas.height = (img.height * scale) + (PADDING * 2) + extraHeight;
        
        ctx.fillStyle = darkMode ? '#282c34' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
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
  
        // Actually draw the grid and color numbers if requested
        if (includeGrid || includeColorNumbers) {
          ctx.save();
          
          // Draw grid lines
          const cellWidth = img.width * scale / pixelWidth;
          const cellHeight = img.height * scale / pixelHeight;
          const fontSize = Math.min(24, Math.max(12, Math.floor(Math.min(cellWidth, cellHeight) / 3)));
          
          ctx.translate(PADDING, PADDING);
          
          // Draw vertical grid lines
          if (includeGrid) {
            for (let i = 0; i <= pixelWidth; i++) {
              const x = i * cellWidth;
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, img.height * scale);
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.lineWidth = 2;
              ctx.stroke();
              
              // Draw column numbers
              if (i < pixelWidth) {
                ctx.save();
                ctx.fillStyle = 'black';
                ctx.font = `${fontSize}px Arial`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.translate(x + cellWidth / 2, -fontSize);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(`${i + 1}`, 0, 0);
                ctx.restore();
              }
            }
            
            // Draw horizontal grid lines
            for (let i = 0; i <= pixelHeight; i++) {
              const y = i * cellHeight;
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(img.width * scale, y);
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.lineWidth = 2;
              ctx.stroke();
              
              // Draw row numbers
              if (i < pixelHeight) {
                ctx.fillStyle = 'black';
                ctx.font = `${fontSize}px Arial`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(i + 1, -fontSize/2, y + cellHeight / 2);
              }
            }
          }
          
          // Draw color numbers
          if (includeColorNumbers && colorIndices) {
            ctx.font = `${Math.min(cellWidth * 0.5, cellHeight * 0.5, 24)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            for (let y = 0; y < pixelHeight; y++) {
              for (let x = 0; x < pixelWidth; x++) {
                const colorIndex = colorIndices[y * pixelWidth + x];
                if (colorIndex !== undefined) {
                  const centerX = x * cellWidth + cellWidth / 2;
                  const centerY = y * cellHeight + cellHeight / 2;
                  
                  // Add white background for better visibility
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  const textWidth = ctx.measureText(colorIndex + 1).width;
                  ctx.fillRect(
                    centerX - textWidth / 2 - 4,
                    centerY - fontSize / 2 - 4,
                    textWidth + 8,
                    fontSize + 8
                  );
                  
                  ctx.fillStyle = 'black';
                  ctx.fillText(colorIndex + 1, centerX, centerY);
                }
              }
            }
          }
          
          ctx.restore();
        }
        
        let yOffset = (img.height * scale) + (PADDING * 2);
        
        // Draw palette if requested
        if (includePalette) {
          const paletteHeight = Math.max(300, Math.min(600, img.height * scale * 0.3));
          ctx.save();
          
          ctx.fillStyle = darkMode ? '#1e2127' : '#f0f0f0';
          ctx.fillRect(0, yOffset, canvas.width, paletteHeight);
          
          ctx.fillStyle = darkMode ? '#61dafb' : '#282c34';
          ctx.font = '36px Arial'; // Increased font size
          ctx.textAlign = 'center';
          ctx.fillText('Color Palette', canvas.width / 2, yOffset + 50);
          
          const colorBoxSize = Math.min(80, canvas.width / (selectedColors.length * 2)); // Larger, adaptive color boxes
          const colorBoxMargin = 20;
          const colorsPerRow = Math.min(selectedColors.length, Math.floor(canvas.width / (colorBoxSize + colorBoxMargin * 2)));
          const startX = (canvas.width - (colorsPerRow * (colorBoxSize + colorBoxMargin * 2))) / 2;
          
          selectedColors.forEach((color, index) => {
            const row = Math.floor(index / colorsPerRow);
            const col = index % colorsPerRow;
            const x = startX + col * (colorBoxSize + colorBoxMargin * 2) + colorBoxMargin;
            const y = yOffset + 100 + row * (colorBoxSize + 60); // More vertical space
            
            // Draw color box
            ctx.fillStyle = color.hex;
            ctx.fillRect(x, y, colorBoxSize, colorBoxSize);
            ctx.lineWidth = 3;  // Thicker border
            ctx.strokeStyle = darkMode ? '#61dafb' : '#282c34';
            ctx.strokeRect(x, y, colorBoxSize, colorBoxSize);
            
            // Draw color number
            ctx.fillStyle = darkMode ? '#ffffff' : '#000000';
            ctx.font = '24px Arial';  // Larger font
            ctx.textAlign = 'center';
            ctx.fillText(`${index + 1}`, x + colorBoxSize / 2, y + colorBoxSize + 24);
            
            // Add hex and RGB values
            ctx.font = '18px Arial';
            ctx.fillText(`${color.hex.toUpperCase()}`, x + colorBoxSize / 2, y + colorBoxSize + 50);
          });
          
          ctx.restore();
          yOffset += paletteHeight;
        }
        
        // Draw stats if requested
        if (includeStats) {
          const statsHeight = Math.max(200, Math.min(400, img.height * scale * 0.2));
          ctx.save();
          
          ctx.fillStyle = darkMode ? '#1e2127' : '#f0f0f0';
          ctx.fillRect(0, yOffset, canvas.width, statsHeight);
          
          ctx.fillStyle = darkMode ? '#61dafb' : '#282c34';
          ctx.font = '36px Arial';  // Larger font
          ctx.textAlign = 'center';
          ctx.fillText('Mosaic Statistics', canvas.width / 2, yOffset + 50);
          
          const tableY = yOffset + 100;  // More vertical space
          const colWidth = canvas.width / 4;
          
          // Draw table headers
          ctx.textAlign = 'left';
          ctx.font = '24px Arial';  // Larger font
          ctx.fillText('Metric', colWidth * 0.1, tableY);
          ctx.textAlign = 'right';
          ctx.fillText('Tiles', colWidth * 1.9, tableY);
          ctx.fillText(`Size in ${outputUnit}`, colWidth * 2.9, tableY);
          ctx.fillText('Cost', colWidth * 3.9, tableY);
          
          // Draw divider line
          ctx.beginPath();
          ctx.moveTo(colWidth * 0.1, tableY + 15);
          ctx.lineTo(colWidth * 3.9 + 50, tableY + 15);
          ctx.strokeStyle = darkMode ? '#61dafb' : '#282c34';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw total stats
          ctx.textAlign = 'left';
          ctx.fillText('Total', colWidth * 0.1, tableY + 60);  // More vertical space
          
          ctx.textAlign = 'right';
          const totalTiles = getTotalTiles();
          ctx.fillText(totalTiles.toString(), colWidth * 1.9, tableY + 60);
          
          const formattedArea = formatArea(totalTiles * tileSize * tileSize, tileSizeUnit, outputUnit);
          ctx.fillText(formattedArea, colWidth * 2.9, tableY + 60);
          
          const formattedCost = formatCost(totalTiles * (tileCost / tileCostPer), currency);
          ctx.fillText(formattedCost, colWidth * 3.9, tableY + 60);
          
          ctx.restore();
        }
  
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imagePreview;
    });
  }, [imagePreview, pixelWidth, colorCount, showGrid, showColorNumbers, 
      quantizeColors, calculateHeight, darkMode, selectedColors, outputUnit, 
      tileSizeUnit, tileSize, getTotalTiles, tileCost, tileCostPer, currency, formatArea, formatCost]);

  const handleDownload = useCallback(() => {
    setDownloadOptions({
      includeGrid: showGrid,
      includeColorNumbers: showColorNumbers,
      includePalette: true,
      includeStats: true
    });
    setShowDownloadOptions(true);
  }, [showGrid, showColorNumbers]);

  const processDownload = useCallback(async (options) => {
    const dataUrl = await generateHighResImage(options || downloadOptions);
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = 'mosaic-template.png';
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadOptions(false);
  }, [generateHighResImage, downloadOptions]);

  const handleColorChange = useCallback((index, newColor) => {
    if (!colorIndices || !canvasRef.current || !imagePreview) return;

    // Update selected colors state
    setSelectedColors(colors => {
      const newColors = [...colors];
      newColors[index] = {
        ...newColors[index],
        r: newColor.r,
        g: newColor.g,
        b: newColor.b,
        hex: newColor.hex,
        count: newColors[index].count // Preserve the count
      };
      return newColors;
    });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const pixelHeight = Math.max(1, calculateHeight(pixelWidth, img.width, img.height));

      // Create small canvas for pixel manipulation
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = pixelWidth;
      smallCanvas.height = pixelHeight;
      const smallCtx = smallCanvas.getContext('2d');

      // Draw original image at small size
      smallCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
      const imageData = smallCtx.getImageData(0, 0, pixelWidth, pixelHeight);

      // Replace colors using existing color indices
      for (let i = 0; i < imageData.data.length; i += 4) {
        const pixelIndex = Math.floor(i / 4);
        const colorIndex = colorIndices[pixelIndex];
        const color = selectedColors[colorIndex];
        if (color) {
          imageData.data[i] = color.r;
          imageData.data[i + 1] = color.g;
          imageData.data[i + 2] = color.b;
          // Keep original alpha value
        }
      }

      // Put modified image data back
      smallCtx.putImageData(imageData, 0, 0);

      // Clear and resize main canvas
      const PADDING = showGrid ? 20 : 0;
      canvas.width = img.width + (PADDING * 2);
      canvas.height = img.height + (PADDING * 2);
      ctx.imageSmoothingEnabled = false;

      // Draw scaled image
      ctx.drawImage(
        smallCanvas,
        0, 0, pixelWidth, pixelHeight,
        PADDING, PADDING, img.width, img.height
      );

      // Redraw grid if needed
      if (showGrid || showColorNumbers) {
        drawGrid(ctx, pixelWidth, pixelHeight, colorIndices);
      }
    };

    img.src = imagePreview;
  }, [colorIndices, canvasRef, imagePreview, pixelWidth, showGrid, showColorNumbers, calculateHeight, drawGrid, selectedColors]);

  const downloadWithOptions = useCallback((options) => {
    return generateHighResImage(options).then(dataUrl => {
      if (!dataUrl) return;

      const link = document.createElement('a');
      link.download = 'mosaic-template.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
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
    showDownloadOptions,
    downloadOptions,

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
    setShowDownloadOptions,
    setDownloadOptions,

    // Handlers
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoom,
    handleDownload,
    processDownload,
    handleImageUpload,
    handleColorChange,

    // Utilities
    getFitDimensions,
    formatSize,
    formatArea,
    formatCost,
    getTotalTiles,
    downloadWithOptions
  };
}