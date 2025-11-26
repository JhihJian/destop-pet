import React, { useEffect, useRef } from 'react';
import './UnifiedDialog.scss';

interface UnifiedDialogProps {
  open: boolean;
  title?: string;
  content: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
}

const UnifiedDialog: React.FC<UnifiedDialogProps> = ({ open, title, content, onClose, actions }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className='unified-dialog-mask'
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="unified-dialog"
        onClick={e => e.stopPropagation()}
      >
        {title && <div className="title">{title}</div>}
        <div className="content">{content}</div>
        {actions && <div className="actions">{actions}</div>}
      </div>
    </div>
  );
};

export default UnifiedDialog; 