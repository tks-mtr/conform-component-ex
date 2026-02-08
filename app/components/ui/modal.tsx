import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  // Handle escape key specifically if needed, though native dialog handles it.
  // We want to sync React state with native behavior
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
        event.preventDefault(); // Prevent native close to control via props
        onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => {
        dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose]);
  
  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
          onClose();
      }
  }

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={clsx(
        "backdrop:bg-gray-900/50 backdrop:backdrop-blur-sm",
        "fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent",
        "w-full max-w-md rounded-xl shadow-2xl open:animate-in open:fade-in-0 open:zoom-in-95"
      )}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden ring-1 ring-gray-900/5">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </dialog>,
    document.body
  );
}
