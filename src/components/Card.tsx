import { cn } from '../utils/cn';

interface CardProps {
  value: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function Card({ value, selected, onClick, disabled }: CardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-16 h-24 sm:w-20 sm:h-32 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all duration-200 shadow-md border-2',
        selected
          ? 'bg-indigo-600 text-white border-indigo-600 -translate-y-4 shadow-lg shadow-indigo-200'
          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:-translate-y-2 hover:shadow-lg',
        disabled && 'opacity-50 cursor-not-allowed hover:-translate-y-0 hover:border-slate-200'
      )}
    >
      {value}
    </button>
  );
}
