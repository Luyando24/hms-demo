'use client'

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  badge?: string;
  sublabel?: string;
}

interface SearchableComboboxProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: (ComboboxOption | string)[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  icon?: React.ReactNode;
  allowCustom?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export function SearchableCombobox({
  name,
  value,
  onChange,
  options,
  placeholder = 'Search or type...',
  className = '',
  inputClassName = '',
  icon,
  allowCustom = true,
  required = false,
  disabled = false,
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to object structure
  const normalizedOptions: ComboboxOption[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (allowCustom) {
      onChange(val);
    }
    setIsOpen(true);
  };

  const handleSelectOption = (opt: ComboboxOption) => {
    onChange(opt.value);
    setSearchQuery(opt.label);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Hidden input for standard native form submits */}
      {name && <input type="hidden" name={name} value={value} />}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}

        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all ${inputClassName}`}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 animate-in fade-in zoom-in-95 duration-150">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 font-medium">
              {allowCustom ? (
                <span>No exact match. Press Enter or click to use <strong className="text-slate-700">"{searchQuery}"</strong></span>
              ) : (
                'No matching options found'
              )}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full text-left p-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-brand-50 text-brand-700 font-bold' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{opt.label}</span>
                    {opt.sublabel && <span className="text-[10px] text-slate-400 font-medium">{opt.sublabel}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {opt.badge && (
                      <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-slate-100 text-slate-600">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check size={14} className="text-brand-600" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
