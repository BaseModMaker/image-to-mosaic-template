import React from 'react';

const ColorEditor = ({ color, index, onColorChange, darkMode }) => {
  const handleColorChange = (e) => {
    const hex = e.target.value;
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    onColorChange(index, { r, g, b, hex });
  };

  return (
    <div style={{ marginTop: '5px' }}>
      <input
        type="color"
        value={color.hex}
        onChange={handleColorChange}
        style={{
          width: '30px',
          height: '30px',
          padding: 0,
          border: `1px solid ${darkMode ? '#61dafb' : '#282c34'}`,
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      />
    </div>
  );
};

export default ColorEditor;