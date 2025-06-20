import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import { X, CheckCircle, Info, AlertTriangle, XCircle } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "info" | "warning" | "error";
  duration?: number;
  onClose: () => void;
}

export function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    error: <XCircle className="h-5 w-5" />,
  };

  const colors = {
    success:
      "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    info: "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    warning:
      "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    error: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all duration-300",
        colors[type],
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Toast container component
export function ToastContainer() {
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type: "success" | "info" | "warning" | "error";
    }>
  >([]);

  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      const { message, type } = event.detail;
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);
    };

    window.addEventListener(
      "in-app-notification",
      handleNotification as EventListener
    );
    return () => {
      window.removeEventListener(
        "in-app-notification",
        handleNotification as EventListener
      );
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}
