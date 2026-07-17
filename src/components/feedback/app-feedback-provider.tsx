"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

type NotificationTone = "success" | "error" | "info" | "warning";

type NotificationItem = {
  id: string;
  message: string;
  tone: NotificationTone;
};

type BlockingActionOptions<T> = {
  errorMessage?: string | ((error: unknown) => string);
  loadingMessage?: string;
  successMessage?: string | ((result: T) => string);
};

type AppFeedbackContextValue = {
  busyMessage: string | null;
  isBusy: boolean;
  notify: (tone: NotificationTone, message: string) => void;
  runBlockingAction: <T>(
    action: () => Promise<T>,
    options?: BlockingActionOptions<T>
  ) => Promise<T>;
};

const AppFeedbackContext = createContext<AppFeedbackContextValue | null>(null);
const DEFAULT_LOADING_MESSAGE = "Estamos procesando tu solicitud. Espera un momento.";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "No pudimos completar la acción.";
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"
    />
  );
}

export function AppFeedbackProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const busyMessageStack = useRef<string[]>([]);

  useEffect(() => {
    if (pendingCount <= 0) {
      busyMessageStack.current = [];
      setBusyMessage(null);
      document.body.style.removeProperty("overflow");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingCount]);

  const notify = useCallback((tone: NotificationTone, message: string) => {
    const id = crypto.randomUUID();
    setNotifications((current) => [...current, { id, tone, message }]);

    window.setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const runBlockingAction = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options?: BlockingActionOptions<T>
    ) => {
      const loadingMessage = options?.loadingMessage ?? DEFAULT_LOADING_MESSAGE;
      busyMessageStack.current.push(loadingMessage);
      setBusyMessage(loadingMessage);
      setPendingCount((current) => current + 1);

      try {
        const result = await action();

        if (options?.successMessage) {
          notify(
            "success",
            typeof options.successMessage === "function"
              ? options.successMessage(result)
              : options.successMessage
          );
        }

        return result;
      } catch (error) {
        notify(
          "error",
          typeof options?.errorMessage === "function"
            ? options.errorMessage(error)
            : options?.errorMessage ?? getErrorMessage(error)
        );
        throw error;
      } finally {
        busyMessageStack.current.pop();
        const nextMessage =
          busyMessageStack.current[busyMessageStack.current.length - 1] ?? null;
        setBusyMessage(nextMessage);
        setPendingCount((current) => Math.max(0, current - 1));
      }
    },
    [notify]
  );

  const value = useMemo<AppFeedbackContextValue>(
    () => ({
      busyMessage,
      isBusy: pendingCount > 0,
      notify,
      runBlockingAction
    }),
    [busyMessage, notify, pendingCount, runBlockingAction]
  );

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex flex-col items-center gap-3 px-4 pt-4">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={[
              "w-full max-w-3xl rounded-2xl border px-5 py-4 text-sm font-semibold shadow-[0_18px_50px_rgba(20,15,11,0.18)] backdrop-blur",
              item.tone === "success" && "border-[#b7dfc0] bg-[#ebf8ee] text-[#256b3a]",
              item.tone === "error" && "border-[#f1b8b1] bg-[#fdecec] text-[#a03228]",
              item.tone === "info" && "border-[#bfd7ee] bg-[#edf5fd] text-[#1f5f99]",
              item.tone === "warning" && "border-[#ead1a5] bg-[#fff5e6] text-[#9a5c10]"
            ]
              .filter(Boolean)
              .join(" ")}
            role="status"
          >
            {item.message}
          </div>
        ))}
      </div>
      {pendingCount > 0 ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#1b140f]/55 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/15 bg-[#241b16] px-8 py-8 text-center text-white shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-white/72">
              Procesando
            </p>
            <p className="mt-3 text-base leading-7 text-white/92">
              {busyMessage ?? DEFAULT_LOADING_MESSAGE}
            </p>
            <p className="mt-3 text-sm text-white/68">
              La interfaz se reactivará cuando termine la operación.
            </p>
          </div>
        </div>
      ) : null}
    </AppFeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(AppFeedbackContext);

  if (!context) {
    throw new Error("useAppFeedback must be used within AppFeedbackProvider");
  }

  return context;
}
