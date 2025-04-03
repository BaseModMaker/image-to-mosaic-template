import React from 'react';
import ColorEditor from './ColorEditor';

const ColorCard = ({ color, index, darkMode, onColorChange }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '5px'
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '50px',
          height: '50px',
          backgroundColor: color.hex,
          border: `2px solid ${darkMode ? '#61dafb' : '#282c34'}`,
          borderRadius: '5px'
        }} />
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
      <ColorEditor 
        color={color}
        index={index}
        onColorChange={onColorChange}
        darkMode={darkMode}
      />
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