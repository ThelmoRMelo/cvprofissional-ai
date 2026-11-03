import { MessageCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

export function WhatsAppFloatingButton() {
  const { supportPhone, whatsappMessage } = useSettingsStore((state) => state.settings);
  if (!supportPhone.trim()) return null;
  const phone = supportPhone.replace(/\D/g, '');
  if (!phone) return null;
  return <a href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" aria-label="Fale conosco pelo WhatsApp" className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110"><MessageCircle className="h-7 w-7" /></a>;
}
