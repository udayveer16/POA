import Image from 'next/image';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  /** Force light version (white bg context) */
  variant?: 'default' | 'light';
  className?: string;
};

const sizes = {
  sm: { width: 100, height: 36 },
  md: { width: 140, height: 50 },
  lg: { width: 200, height: 72 },
};

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const { width, height } = sizes[size];
  return (
    <Image
      src="/logo5.png"
      alt="Presque Vu"
      width={width}
      height={height}
      className={className}
      priority
      style={{ objectFit: 'contain' }}
    />
  );
}