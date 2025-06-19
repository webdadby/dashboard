'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface CustomDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;  // Changed from string to ReactNode
  children: ReactNode;
}

export function CustomDialog({ open, onClose, title, children }: CustomDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Handle clicks outside the dialog
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      // Only prevent default if clicking outside the dialog
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Handle Escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Add event listeners when dialog is open
    if (open) {
      // Use capture phase to catch the event before it reaches other handlers
      document.addEventListener('mousedown', handleMouseDown, true);
      document.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);
  
  // Prevent click propagation on the dialog content
  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !open) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleDialogClick}
    >
      <div 
        ref={dialogRef}
        className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-lg"
        onClick={handleDialogClick}
      >
        <div className="absolute right-4 top-4">
          <button
            type="button"
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Закрыть</span>
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="py-2">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
