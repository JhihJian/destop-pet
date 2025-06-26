import React, { useState, useEffect } from 'react';
import './InteractiveDialog.css';

interface InteractiveDialogProps {
  isOpen: boolean;
  message: string;
  options: string[];
  onSelect: (response: string) => void;
  hasInputField: boolean;
}

const InteractiveDialog: React.FC<InteractiveDialogProps> = ({ isOpen, message, options, onSelect, hasInputField }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);
  
  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    onSelect(hasInputField ? inputValue : 'ok');
  };

  return (
    <div className="dialog-overlay-local">
      <div className="dialog-box-local">
        <p className="dialog-message-local">{message}</p>
        
        {hasInputField && (
          <input
            type="text"
            className="dialog-input-local"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="请输入内容..."
            autoFocus
          />
        )}
        
        <div className="dialog-options-local">
          {options && options.length > 0 ? (
            options.map((option, index) => (
              <button 
                key={index} 
                className="dialog-button-local"
                onClick={() => onSelect(option)}
              >
                {option}
              </button>
            ))
          ) : (
            <button 
              className="dialog-button-local primary"
              onClick={handleConfirm}
            >
              确定
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveDialog; 