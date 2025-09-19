import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BrutalistCardProps {
  title: string;
  content: string;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'green' | 'purple' | 'blue' | 'orange' | 'gray' | 'indigo';
}

const variantStyles = {
  default: 'border-gray-600 shadow-[12px_12px_0_#6b7280] hover:shadow-[17px_17px_0_#6b7280]',
  green: 'border-green-600 shadow-[12px_12px_0_#059669] hover:shadow-[17px_17px_0_#059669]',
  purple: 'border-purple-600 shadow-[12px_12px_0_#7c3aed] hover:shadow-[17px_17px_0_#7c3aed]',
  blue: 'border-blue-600 shadow-[12px_12px_0_#2563eb] hover:shadow-[17px_17px_0_#2563eb]',
  orange: 'border-orange-600 shadow-[12px_12px_0_#ea580c] hover:shadow-[17px_17px_0_#ea580c]',
  gray: 'border-gray-600 shadow-[12px_12px_0_#4b5563] hover:shadow-[17px_17px_0_#4b5563]',
  indigo: 'border-indigo-600 shadow-[12px_12px_0_#4338ca] hover:shadow-[17px_17px_0_#4338ca]',
};

export function BrutalistCard({ 
  title, 
  content, 
  children, 
  className, 
  onClick,
  variant = 'default'
}: BrutalistCardProps) {
  const CardComponent = onClick ? 'button' : 'div';
  
  return (
    <CardComponent
      onClick={onClick}
      className={cn(
        'brutalist-card w-full max-w-sm p-5 bg-white border-6 transition-all duration-300 ease-out hover:transform hover:-translate-x-1 hover:-translate-y-1',
        variantStyles[variant],
        onClick && 'cursor-pointer focus:outline-none focus:ring-4 focus:ring-gray-600 focus:ring-offset-2',
        className
      )}
    >
      <h3 className="brutalist-card__title text-2xl font-black text-black uppercase mb-4 block relative overflow-hidden">
        {title}
      </h3>
      
      <p className="brutalist-card__content text-base leading-relaxed text-black mb-5">
        {content}
      </p>
      
      {children && (
        <div className="brutalist-card__extra">
          {children}
        </div>
      )}
    </CardComponent>
  );
}

interface BrutalistFormCardProps {
  title: string;
  content: string;
  placeholder: string;
  buttonText: string;
  onSubmit: (value: string) => void;
  className?: string;
  variant?: 'default' | 'green' | 'purple' | 'blue' | 'orange' | 'gray' | 'indigo';
}

export function BrutalistFormCard({
  title,
  content,
  placeholder,
  buttonText,
  onSubmit,
  className,
  variant = 'default'
}: BrutalistFormCardProps) {
  const [inputValue, setInputValue] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className={cn(
      'brutalist-card w-full max-w-sm p-5 bg-white border-6 transition-all duration-300 ease-out hover:transform hover:-translate-x-1 hover:-translate-y-1',
      variantStyles[variant],
      className
    )}>
      <h3 className="brutalist-card__title text-2xl font-black text-black uppercase mb-4 block relative overflow-hidden">
        {title}
      </h3>
      
      <p className="brutalist-card__content text-base leading-relaxed text-black mb-5">
        {content}
      </p>
      
      <form onSubmit={handleSubmit} className="brutalist-card__form flex flex-col gap-4">
        <input
          required
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="brutalist-input p-2.5 border-3 border-gray-600 text-base font-urbanist transition-all duration-300 focus:outline-none focus:scale-105 focus:bg-gray-600 focus:text-white"
        />
        <button
          type="submit"
          className="brutalist-button border-3 border-gray-600 bg-gray-600 text-white p-2.5 text-lg font-bold uppercase cursor-pointer relative overflow-hidden transition-all duration-300 hover:scale-95 active:scale-90 w-1/2 mx-auto"
        >
          <span className="relative z-10">{buttonText}</span>
          <div className="brutalist-button__overlay absolute top-0 left-0 w-full h-full bg-green-400 text-black flex items-center justify-center transform translate-y-full transition-transform duration-300 hover:translate-y-0">
            Sure?
          </div>
        </button>
      </form>
    </div>
  );
}
