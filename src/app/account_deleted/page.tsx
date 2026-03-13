import Image from 'next/image';
import ComplianceFooter from '@/components/ComplianceFooter';

export default function AccountDeletedPage() {
  return (
    <div className="bg-pattern min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3">
          <Image src="/logo5.png" alt="PV" width={40} height={40} style={{ objectFit: 'contain' }} />
          <div className="text-left leading-tight">
            <div className="serif text-2xl" style={{ color: 'var(--ink)' }}>Presque</div>
            <div className="serif text-2xl" style={{ color: 'var(--accent)' }}>Vu</div>
          </div>
        </div>
        </div>
        <div className="text-5xl mb-4">👋</div>
        <h1 className="serif text-3xl mb-2" style={{ color: 'var(--ink)' }}>Account Deleted</h1>
        <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
          Your account and all associated personal data have been permanently deleted from our systems.
        </p>
        <p className="text-xs mb-8" style={{ color: 'var(--muted)' }}>
          This includes your name, email, phone number, and all attendance tokens.
        </p>
        <a href="/"
          className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}>
          Back to Home
        </a>
      </div>
      <ComplianceFooter className="mt-12" />
    </div>
  );
}