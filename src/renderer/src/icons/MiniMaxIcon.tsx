type Props = {
  width?: number;
  height?: number;
  className?: string;
};

export const MiniMaxIcon = ({ width = 64, height = 64, className }: Props) => (
  <div
    aria-label="MiniMax"
    className={`flex items-center justify-center rounded-md ${className || ''}`}
    style={{
      background: 'linear-gradient(135deg, #0d47a1, #1976d2)',
      color: '#fff',
      height: `${height}px`,
      width: `${width}px`,
    }}
  >
    <svg viewBox="0 0 48 48" width={width * 0.65} height={height * 0.65} fill="currentColor" aria-hidden="true">
      <title>MiniMax</title>
      <path d="M9.6 11.2c1.6-2.8 4.9-4.8 8.2-4.8 3.2 0 5.9 1.6 7.6 4 1.7-2.4 4.4-4 7.6-4 3.3 0 6.6 2 8.2 4.8 1.6 2.7 1.8 5.9.5 8.7L27.5 39.4a3.4 3.4 0 0 1-5.9 0L9.1 19.9c-1.3-2.8-1.1-6 .5-8.7Zm14.7 4.6-4.1 6.6 4.1 6.6 4.1-6.6-4.1-6.6Zm-8.3-5c-1.9 0-3.9 1.1-4.8 2.7-.9 1.6-.9 3.6-.1 5.3l4.3 7 3.8-6.1-3.2-5.2c-.5-.9-1.6-1.3-2.6-1.3Zm16.7 0c-1 0-2.1.4-2.6 1.3l-3.2 5.2 3.8 6.1 4.3-7c.8-1.7.8-3.7-.1-5.3-.9-1.6-2.9-2.7-4.8-2.7Z" />
    </svg>
  </div>
);
