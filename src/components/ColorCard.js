import React from 'react';

const ColorCard = ({ color, index, darkMode, onColorChange }) => {
  const handleColorChange = (e) => {
    const hex = e.target.value;
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    onColorChange(index, { r, g, b, hex });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '5px'
    }}>
      <div style={{ position: 'relative' }}>
        <input
          type="color"
          value={color.hex}
          onChange={handleColorChange}
          style={{
            width: '50px',
            height: '50px',
            padding: 0,
            border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
            borderRadius: '5px',
            cursor: 'pointer'
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
  );
};

export default ColorCard;