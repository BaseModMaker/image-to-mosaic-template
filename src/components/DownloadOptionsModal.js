import React from 'react';

const DownloadOptionsModal = ({ 
  show, 
  options, 
  setOptions,
  onClose,
  onDownload,
  darkMode
}) => {
  if (!show) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: darkMode ? '#282c34' : '#ffffff',
        padding: '20px',
        borderRadius: '5px',
        minWidth: '300px',
        color: darkMode ? '#61dafb' : '#282c34',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
      }}>
        <h3 style={{ marginTop: 0 }}>Download Options</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={options.includeGrid}
              onChange={(e) => setOptions({...options, includeGrid: e.target.checked})}
              style={{ marginRight: '8px' }}
            />
            Include Grid Lines
          </label>
          
          <label style={{ display: 'block', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={options.includeColorNumbers}
              onChange={(e) => setOptions({...options, includeColorNumbers: e.target.checked})}
              style={{ marginRight: '8px' }}
            />
            Include Color Numbers
          </label>
          
          <label style={{ display: 'block', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={options.includePalette}
              onChange={(e) => setOptions({...options, includePalette: e.target.checked})}
              style={{ marginRight: '8px' }}
            />
            Include Color Palette
          </label>
          
          <label style={{ display: 'block', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={options.includeStats}
              onChange={(e) => setOptions({...options, includeStats: e.target.checked})}
              style={{ marginRight: '8px' }}
            />
            Include Statistics
          </label>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '5px 10px',
              cursor: 'pointer',
              backgroundColor: darkMode ? 'transparent' : '#f0f0f0',
              border: `1px solid ${darkMode ? '#61dafb' : '#282c34'}`,
              borderRadius: '5px',
              color: darkMode ? '#61dafb' : '#282c34'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onDownload}
            style={{
              padding: '5px 10px',
              cursor: 'pointer',
              backgroundColor: darkMode ? '#61dafb' : '#282c34',
              border: 'none',
              borderRadius: '5px',
              color: darkMode ? '#282c34' : '#ffffff'
            }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadOptionsModal;