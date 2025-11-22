import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  variant?: 'default' | 'dark';
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  label,
  variant = 'default',
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);
  const isDark = variant === 'dark';

  return (
    <div className="w-full">
      {label && (
        <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wide ${
          isDark ? 'text-white/70' : 'text-gray-500'
        }`}>
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={`relative w-full px-3 py-2.5 rounded-xl text-left text-sm transition-colors
              ${isDark
                ? `bg-white/10 backdrop-blur-sm border border-white/20 ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-white/20 cursor-pointer'}`
                : `bg-white border border-gray-200 ${disabled ? 'bg-gray-50 cursor-not-allowed text-gray-400' : 'hover:border-gray-300 cursor-pointer'}`
              }
              focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-white/50' : 'focus:ring-teal-500'} focus:border-transparent`}
          >
            <span className={`block truncate ${
              isDark
                ? (!selectedOption ? 'text-white/60' : 'text-white')
                : (!selectedOption ? 'text-gray-400' : 'text-gray-900')
            }`}>
              {selectedOption?.label || placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className={`h-4 w-4 ${isDark ? 'text-white/60' : (disabled ? 'text-gray-300' : 'text-gray-400')}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            >
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active, selected }) =>
                    `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors
                    ${active ? 'bg-teal-50 text-teal-900' : 'text-gray-900'}
                    ${selected ? 'font-medium' : 'font-normal'}`
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {option.label}
                      </span>
                      {selected && (
                        <span
                          className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            active ? 'text-teal-600' : 'text-teal-600'
                          }`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
