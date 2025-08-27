import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: {
    address: string;
    city: string;
    state: string;
    formatted_address: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  placeholder?: string;
  value?: string;
}

const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  onPlaceSelect,
  placeholder = "Search for a location...",
  value = ""
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [recentSearches] = useState([
    'Masjid Negara, Kuala Lumpur',
    'Shah Alam, Selangor',
    'KLCC, Kuala Lumpur'
  ]);

  // Initialize Google Maps API
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.warn('Google Maps API key not found. Using fallback mode.');
        return;
      }

      try {
        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        // Initialize services
        const autoService = new google.maps.places.AutocompleteService();
        setAutocompleteService(autoService);
        
        // Create a dummy div for PlacesService (required by Google Maps API)
        const dummyDiv = document.createElement('div');
        const placesService = new google.maps.places.PlacesService(dummyDiv);
        setPlacesService(placesService);
        
        setIsApiLoaded(true);
      } catch (error) {
        console.error('Error loading Google Maps API:', error);
      }
    };

    initializeGoogleMaps();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.length > 0 && isApiLoaded && autocompleteService) {
      setIsLoading(true);
      
      // Configure autocomplete request
      const request: google.maps.places.AutocompletionRequest = {
        input: value,
        componentRestrictions: { country: 'my' }, // Restrict to Malaysia
        types: ['establishment', 'geocode'], // Include both places and addresses
      };

      autocompleteService.getPlacePredictions(request, (predictions, status) => {
        setIsLoading(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setPredictions(predictions);
          setShowSuggestions(true);
        } else {
          setPredictions([]);
          setShowSuggestions(true);
        }
      });
    } else if (value.length === 0) {
      setPredictions([]);
      setShowSuggestions(false);
    } else {
      // Fallback for when API is not loaded
      setPredictions([]);
      setShowSuggestions(true);
    }
  };

  const handlePlaceSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService) {
      // Fallback when API is not available
      // Use the main text (place name) for display
      const displayName = prediction.structured_formatting?.main_text || prediction.description.split(', ')[0];
      
      // Parse for database storage
      const parts = prediction.description.split(', ');
      const city = prediction.structured_formatting?.main_text || parts[0] || '';
      const secondary = prediction.structured_formatting?.secondary_text || '';
      const secondaryParts = secondary.split(', ');
      const state = secondaryParts[secondaryParts.length - 1] || parts[parts.length - 1] || '';
      
      setInputValue(displayName);
      setShowSuggestions(false);
      
      onPlaceSelect({
        address: prediction.description,
        city: city,
        state: state,
        formatted_address: prediction.description,
        latitude: undefined,
        longitude: undefined
      });
      return;
    }

    // Get detailed place information
    const request: google.maps.places.PlaceDetailsRequest = {
      placeId: prediction.place_id,
      fields: ['address_components', 'formatted_address', 'name', 'geometry']
    };

    placesService.getDetails(request, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        let city = '';
        let state = '';
        let address = place.formatted_address || prediction.description;

        // Enhanced parsing of address components with priority order
        if (place.address_components) {
          for (const component of place.address_components) {
            const types = component.types;
            
            // Priority order for city: locality > sublocality_level_1 > administrative_area_level_2 > political
            if (!city && (types.includes('locality'))) {
              city = component.long_name;
            } else if (!city && types.includes('sublocality_level_1')) {
              city = component.long_name;
            } else if (!city && types.includes('administrative_area_level_2')) {
              city = component.long_name;
            } else if (!city && types.includes('political') && !types.includes('country')) {
              city = component.long_name;
            }
            
            // State parsing
            if (!state && types.includes('administrative_area_level_1')) {
              state = component.long_name;
            }
          }
        }

        // Enhanced fallback parsing using structured formatting and description
        if (!city || !state) {
          // Try to use structured formatting first
          if (prediction.structured_formatting) {
            if (!city) {
              city = prediction.structured_formatting.main_text || '';
            }
            
            if (!state && prediction.structured_formatting.secondary_text) {
              const secondaryParts = prediction.structured_formatting.secondary_text.split(', ');
              // State is usually the last part in secondary text
              state = secondaryParts[secondaryParts.length - 1] || '';
            }
          }
          
          // Final fallback using formatted address
          if (!city || !state) {
            const parts = address.split(', ');
            if (!city && parts.length > 0) {
              // For Malaysian addresses, city is often the first or second part
              city = parts[0] || '';
              // If first part looks like a street address, use second part
              if (city.match(/^\d+/) || city.toLowerCase().includes('jalan') || city.toLowerCase().includes('lorong')) {
                city = parts[1] || parts[0];
              }
            }
            if (!state && parts.length > 1) {
              // State is usually the last part for Malaysian addresses
              state = parts[parts.length - 1] || '';
            }
          }
        }

        // Clean up the extracted values
        city = city.trim();
        state = state.trim();
        
        // Remove common prefixes/suffixes that might interfere
        if (state.toLowerCase().includes('malaysia')) {
          const stateParts = state.split(',');
          state = stateParts[0].trim();
        }

        // Extract coordinates from place geometry
        let latitude: number | undefined;
        let longitude: number | undefined;
        
        if (place.geometry && place.geometry.location) {
          latitude = place.geometry.location.lat();
          longitude = place.geometry.location.lng();
        }
        setInputValue(place.name || address);
        setShowSuggestions(false);
        
        onPlaceSelect({
          address: address,
          city: city,
          state: state,
          formatted_address: address,
          latitude: latitude,
          longitude: longitude
        });
      }
    });
  };

  const handleRecentSearchSelect = (search: string) => {
    const parts = search.split(', ');
    setInputValue(parts[0]);
    setShowSuggestions(false);
    onPlaceSelect({
      address: search,
      city: parts[1] || parts[0],
      state: parts[2] || '',
      formatted_address: search,
      latitude: undefined,
      longitude: undefined
    });
  };

  const handleInputFocus = () => {
    if (inputValue.length === 0) {
      setShowSuggestions(true);
    } else if (predictions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const getPlaceIcon = (types: string[]) => {
    if (types.includes('mosque') || types.includes('place_of_worship')) {
      return '🕌';
    } else if (types.includes('establishment') || types.includes('point_of_interest')) {
      return '🏢';
    } else if (types.includes('university') || types.includes('school')) {
      return '🎓';
    } else {
      return '📍';
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300"
          placeholder={placeholder}
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
          </div>
        )}
      </div>
      
      {showSuggestions && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 flex items-center space-x-3"
              onClick={() => handlePlaceSelect(prediction)}
            >
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs">{getPlaceIcon(prediction.types)}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {prediction.structured_formatting.main_text}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {prediction.structured_formatting.secondary_text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showSuggestions && inputValue.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
            Recent searches
          </div>
          {recentSearches.map((search, index) => (
            <div
              key={index}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 flex items-center space-x-3"
              onClick={() => handleRecentSearchSelect(search)}
            >
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="text-sm text-gray-700">{search}</div>
            </div>
          ))}
        </div>
      )}
      
      {showSuggestions && predictions.length === 0 && inputValue.length > 0 && !isLoading && isApiLoaded && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="px-4 py-3 text-gray-500 text-center text-sm">
            No locations found
          </div>
        </div>
      )}

      {!isApiLoaded && inputValue.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="px-4 py-3 text-amber-600 text-center text-sm">
            Google Places API not configured. Add VITE_GOOGLE_MAPS_API_KEY to your .env file.
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacesAutocomplete;