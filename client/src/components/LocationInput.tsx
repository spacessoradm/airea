import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, CheckCircle, XCircle, Loader2, Search, Building } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface LocationValidationResult {
  valid: boolean;
  coordinates?: { lat: number; lng: number };
  locationName?: string;
  source?: string;
  address?: string;
  message?: string;
  suggestions?: string[];
}

interface LocationInputProps {
  value?: string;
  onChange?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  onValidationChange?: (isValid: boolean, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  showValidationStatus?: boolean;
}

export function LocationInput({
  value = "",
  onChange,
  onValidationChange,
  placeholder = "Enter building name, landmark, or address...",
  label = "Location",
  required = false,
  className,
  showValidationStatus = true
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [validationResult, setValidationResult] = useState<LocationValidationResult | null>(null);
  const [hasValidated, setHasValidated] = useState(false);

  // Location validation mutation
  const validateLocationMutation = useMutation({
    mutationFn: async (locationName: string) => {
      const response = await apiRequest('POST', '/api/locations/validate', { 
        locationName,
        address: locationName 
      });
      return response as unknown as LocationValidationResult;
    },
    onSuccess: (result) => {
      setValidationResult(result);
      setHasValidated(true);
      
      if (result.valid && result.coordinates) {
        onValidationChange?.(true, result.coordinates);
        onChange?.(result.locationName || inputValue, result.coordinates);
      } else {
        onValidationChange?.(false);
      }
    },
    onError: (error) => {
      console.error('Location validation error:', error);
      setValidationResult({
        valid: false,
        message: "Failed to validate location. Please try again.",
        suggestions: ["Check your internet connection", "Try a different location name"]
      });
      setHasValidated(true);
      onValidationChange?.(false);
    }
  });

  // Auto-validate when input changes (debounced)
  useEffect(() => {
    if (!inputValue.trim()) {
      setValidationResult(null);
      setHasValidated(false);
      onValidationChange?.(false);
      return;
    }

    const timer = setTimeout(() => {
      if (inputValue.trim().length >= 3) {
        validateLocationMutation.mutate(inputValue.trim());
      }
    }, 800); // Debounce for 800ms

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setHasValidated(false);
    setValidationResult(null);
    onChange?.(newValue);
  };

  const handleManualValidate = () => {
    if (inputValue.trim().length >= 2) {
      validateLocationMutation.mutate(inputValue.trim());
    }
  };

  const getValidationIcon = () => {
    if (validateLocationMutation.isPending) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (validationResult?.valid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (hasValidated && !validationResult?.valid) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getValidationBadge = () => {
    if (!showValidationStatus || !hasValidated) return null;

    if (validationResult?.valid) {
      const source = validationResult.source === 'hybrid' ? 'Found' : 'Local';
      return (
        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
          <Building className="h-3 w-3 mr-1" />
          {source}
        </Badge>
      );
    }

    if (hasValidated && !validationResult?.valid) {
      return (
        <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Not Found
        </Badge>
      );
    }

    return null;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor="location-input" className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {getValidationBadge()}
      </div>

      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            id="location-input"
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className={cn(
              "pl-10 pr-12",
              validationResult?.valid && "border-green-300 focus:border-green-500 focus:ring-green-200",
              hasValidated && !validationResult?.valid && "border-red-300 focus:border-red-500 focus:ring-red-200"
            )}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {getValidationIcon()}
            {inputValue.trim().length >= 2 && !validateLocationMutation.isPending && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleManualValidate}
                className="h-6 w-6 p-0"
              >
                <Search className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validationResult?.valid && validationResult.coordinates && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">
                  Location verified: {validationResult.locationName || inputValue}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Coordinates: {validationResult.coordinates.lat.toFixed(6)}, {validationResult.coordinates.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Error */}
      {hasValidated && !validationResult?.valid && validationResult?.message && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <p className="font-medium">{validationResult.message}</p>
              {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Suggestions:</p>
                  <ul className="text-sm space-y-1">
                    {validationResult.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span className="text-red-400 mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {validateLocationMutation.isPending && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Searching location...</span>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        Enter any Malaysian building, landmark, or address. Our system searches both local and Google Maps data.
      </p>
    </div>
  );
}