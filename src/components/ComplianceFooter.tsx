import Image from 'next/image';

export default function ComplianceFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`text-center py-6 px-4 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 opacity-30">
          <Image src="/logo5.png" alt="PV" width={50} height={50} style={{ objectFit: 'contain' }} />
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>Presque Vu</span>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-xs"
          style={{ color: 'var(--muted)' }}>
          <span>© {new Date().getFullYear()} Presque Vu</span>
          <span>·</span>
          <a href="/privacy-policy" className="underline hover:opacity-70" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <span>·</span>
          <a href="/terms-of-service" className="underline hover:opacity-70" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          <span>·</span>
          <a href="mailto:grievance@yourdomain.com" className="underline hover:opacity-70">Grievance Officer</a>
        </div>
      </div>
    </footer>
  );
}