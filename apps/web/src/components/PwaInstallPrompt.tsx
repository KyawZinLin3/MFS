import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener('beforeinstallprompt', onInstallAvailable);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallAvailable);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') setInstallEvent(null);
  };

  return <>
    {!online && <div role="status" className="fixed inset-x-3 top-3 z-[100] mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900 shadow-lg">
      You’re offline. The app shell is available; live data requires a connection.
    </div>}
    {installEvent && <aside className="fixed bottom-4 right-4 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_50px_-20px_rgba(15,23,42,.4)]" aria-label="Install MFS Portal">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#254db8] text-sm font-bold text-white" aria-hidden="true">m</div>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">Install MFS Portal</p><p className="text-xs text-slate-500">Open it from your home screen</p></div>
      <button type="button" onClick={() => void install()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#254db8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1e419c] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><Download size={14} />Install</button>
      <button type="button" onClick={() => setInstallEvent(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss install prompt"><X size={16} /></button>
    </aside>}
  </>;
}
