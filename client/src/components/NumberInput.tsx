import { Input } from "@/components/ui/input";
import { forwardRef, useState } from "react";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number | string;
  onChange?: (value: number | undefined) => void;
  allowDecimal?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, allowDecimal = false, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>(() => {
      if (value === undefined || value === null || value === '') return '';
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(numValue) ? '' : numValue.toLocaleString('en-US');
    });

    const formatNumber = (num: number): string => {
      return num.toLocaleString('en-US');
    };

    const parseFormattedNumber = (str: string): number | undefined => {
      if (!str.trim()) return undefined;
      // Remove all commas and parse
      const cleanStr = str.replace(/,/g, '');
      const num = allowDecimal ? parseFloat(cleanStr) : parseInt(cleanStr);
      return isNaN(num) ? undefined : num;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Allow empty input for deletion
      if (inputValue === '') {
        setDisplayValue('');
        onChange?.(undefined);
        return;
      }

      // Remove all non-numeric characters except decimal point if allowed
      if (allowDecimal) {
        inputValue = inputValue.replace(/[^\d.]/g, '');
        // Ensure only one decimal point
        const parts = inputValue.split('.');
        if (parts.length > 2) {
          inputValue = parts[0] + '.' + parts.slice(1).join('');
        }
      } else {
        inputValue = inputValue.replace(/\D/g, '');
      }

      if (inputValue === '') {
        setDisplayValue('');
        onChange?.(undefined);
        return;
      }

      // For decimal inputs, preserve the input as-is (including trailing decimal point)
      // Don't format until blur
      if (allowDecimal) {
        setDisplayValue(inputValue);
        const numValue = parseFloat(inputValue);
        onChange?.(isNaN(numValue) ? undefined : numValue);
      } else {
        const numValue = parseInt(inputValue);
        if (!isNaN(numValue)) {
          // Format with commas for display (whole numbers only)
          const formatted = formatNumber(numValue);
          setDisplayValue(formatted);
          onChange?.(numValue);
        }
      }
    };

    const handleBlur = () => {
      // Re-format on blur to ensure consistency
      const numValue = parseFormattedNumber(displayValue);
      if (numValue !== undefined) {
        setDisplayValue(formatNumber(numValue));
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all text on focus for easy editing
      e.target.select();
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";
