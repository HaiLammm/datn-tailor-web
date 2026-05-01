"use client";

/**
 * MeasurementForm Component
 * Story 11.4: Profile-Driven Measurement Form UI
 *
 * Features:
 * - Customer selection combobox with search (AC #1)
 * - Auto-fill measurements from customer profile (AC #2)
 * - Handle customers without measurements (AC #3)
 * - 10 measurement fields with Vietnamese labels (AC #4)
 * - Manual edit capability with indicator (AC #5)
 * - Validation with Vietnamese error messages (AC #6)
 * - Pattern session creation (AC #7)
 * - Error handling (AC #8)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  PATTERN_MEASUREMENT_FIELDS,
  PatternMeasurementSchema,
  PATTERN_TO_CUSTOMER_MAPPING,
  type PatternMeasurementInput,
  type MeasurementKey,
} from "@/types/pattern";
import type { MeasurementResponse } from "@/types/customer";
import {
  useCreatePatternSession,
  useCustomerMeasurement,
  useCustomerSearch,
} from "@/hooks/usePatternSession";

// ===== Types =====

interface SelectedCustomer {
  id: string;
  full_name: string;
  phone: string;
}

interface MeasurementFormProps {
  onSessionCreated?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

// ===== Sub-Components =====

/**
 * Customer Search Combobox (AC #1)
 */
function CustomerCombobox({
  onSelect,
  selectedCustomer,
  onClear,
}: {
  onSelect: (customer: SelectedCustomer) => void;
  selectedCustomer: SelectedCustomer | null;
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { results, isSearching, search, clear } = useCustomerSearch();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    search(value);
    setIsOpen(true);
  };

  const handleSelect = (customer: SelectedCustomer) => {
    onSelect(customer);
    setInputValue("");
    clear();
    setIsOpen(false);
  };

  const handleClear = () => {
    onClear();
    setInputValue("");
    clear();
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Khách hàng
      </label>

      {selectedCustomer ? (
        // Selected customer display
        <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div>
            <span className="font-medium text-indigo-900">
              {selectedCustomer.full_name}
            </span>
            <span className="text-indigo-600 ml-2 text-sm">
              {selectedCustomer.phone}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-indigo-600 hover:text-indigo-800 p-1 rounded-full hover:bg-indigo-100 transition-colors"
            aria-label="Xóa khách hàng đã chọn"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        // Search input
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => inputValue.length >= 2 && setIsOpen(true)}
            placeholder="Tìm khách hàng (tên hoặc SĐT)..."
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            aria-label="Tìm kiếm khách hàng"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          />

          {/* Loading indicator */}
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && !selectedCustomer && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => handleSelect(customer)}
              className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
              role="option"
            >
              <span className="font-medium text-gray-900">{customer.full_name}</span>
              <span className="text-gray-500 ml-2 text-sm">{customer.phone}</span>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && inputValue.length >= 2 && results.length === 0 && !isSearching && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          Không tìm thấy khách hàng
        </div>
      )}
    </div>
  );
}

/**
 * Single Measurement Input Field (AC #4)
 */
function MeasurementInput({
  label,
  name,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string;
  name: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string;
  disabled?: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      onChange(undefined);
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          type="number"
          step="0.1"
          value={value ?? ""}
          onChange={handleChange}
          disabled={disabled}
          className={`block w-full pr-10 py-2.5 border rounded-lg font-mono transition-colors ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
              : "border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
          } ${disabled ? "bg-gray-50 text-gray-500" : ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm pointer-events-none">
          cm
        </span>
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// ===== Main Component =====

export default function MeasurementForm({ onSessionCreated, onError }: MeasurementFormProps) {
  // Customer selection state
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [autoFillDate, setAutoFillDate] = useState<string | null>(null);

  // Fetch customer measurement when selected
  const { measurement, isLoading: isMeasurementLoading, hasMeasurement } = useCustomerMeasurement(
    selectedCustomer?.id ?? null
  );

  // Pattern session creation mutation
  const { mutate: createSession, isPending: isCreating } = useCreatePatternSession({
    onSuccess: (data) => {
      onSessionCreated?.(data.id);
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  // Form state with Zod validation
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<PatternMeasurementInput>({
    resolver: zodResolver(PatternMeasurementSchema),
    mode: "onBlur",
  });

  // Watch all measurement values for controlled inputs
  const measurementValues = watch();

  // Auto-fill measurements when customer measurement is loaded (AC #2)
  useEffect(() => {
    if (measurement && !isManuallyEdited) {
      // Map customer measurement fields to pattern fields
      for (const field of PATTERN_MEASUREMENT_FIELDS) {
        const customerField = PATTERN_TO_CUSTOMER_MAPPING[field.key];
        if (customerField && measurement[customerField as keyof MeasurementResponse] != null) {
          const value = measurement[customerField as keyof MeasurementResponse];
          if (typeof value === "number") {
            setValue(field.key, value);
          }
        }
      }
      setAutoFillDate(measurement.measured_date);
    }
  }, [measurement, isManuallyEdited, setValue]);

  // Handle customer selection
  const handleCustomerSelect = useCallback((customer: SelectedCustomer) => {
    setSelectedCustomer(customer);
    setIsManuallyEdited(false);
    setAutoFillDate(null);
  }, []);

  // Handle customer clear
  const handleCustomerClear = useCallback(() => {
    setSelectedCustomer(null);
    setIsManuallyEdited(false);
    setAutoFillDate(null);
    reset();
  }, [reset]);

  // Handle measurement change (AC #5)
  const handleMeasurementChange = useCallback(
    (key: MeasurementKey, value: number | undefined) => {
      setValue(key, value as number, { shouldValidate: true });
      if (selectedCustomer && hasMeasurement) {
        setIsManuallyEdited(true);
      }
    },
    [setValue, selectedCustomer, hasMeasurement]
  );

  // Handle form submission (AC #7)
  const onSubmit = useCallback(
    (data: PatternMeasurementInput) => {
      createSession({
        customer_id: selectedCustomer?.id ?? null,
        garment_type: "ao_dai",
        ...data,
      });
    },
    [createSession, selectedCustomer]
  );

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer Selection (AC #1) */}
      <CustomerCombobox
        onSelect={handleCustomerSelect}
        selectedCustomer={selectedCustomer}
        onClear={handleCustomerClear}
      />

      {/* Auto-fill indicator (AC #2) */}
      {selectedCustomer && hasMeasurement && autoFillDate && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>
            Số đo từ: <strong>{selectedCustomer.full_name}</strong> (cập nhật: {formatDate(autoFillDate)})
          </span>
          {isManuallyEdited && (
            <span className="text-amber-600 ml-2 font-medium">• Đã chỉnh sửa thủ công</span>
          )}
        </div>
      )}

      {/* Warning for no measurements (AC #3) */}
      {selectedCustomer && !isMeasurementLoading && !hasMeasurement && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">
            Khách hàng chưa có số đo. Vui lòng nhập thủ công hoặc tạo hồ sơ số đo.
          </p>
        </div>
      )}

      {/* Loading state for measurement fetch */}
      {selectedCustomer && isMeasurementLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Đang tải số đo...</span>
        </div>
      )}

      {/* 10 Measurement Fields (AC #4) - 2 columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PATTERN_MEASUREMENT_FIELDS.map((field) => (
          <MeasurementInput
            key={field.key}
            label={field.label}
            name={field.key}
            value={measurementValues[field.key]}
            onChange={(value) => handleMeasurementChange(field.key, value)}
            error={errors[field.key]?.message}
          />
        ))}
      </div>

      {/* Submit Button (AC #7) */}
      <button
        type="submit"
        disabled={isCreating}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
          isCreating
            ? "bg-primary/70 cursor-not-allowed"
            : "bg-primary hover:bg-primary/90"
        }`}
        style={{ backgroundColor: isCreating ? undefined : "#D4AF37" }}
      >
        {isCreating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Đang tạo phiên thiết kế...
          </span>
        ) : (
          "Tạo rập"
        )}
      </button>
    </form>
  );
}
