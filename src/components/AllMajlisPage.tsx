import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Map, Navigation, ArrowLeft, Search, Filter, Users, Share2, X, ZoomIn, ListOrdered, MapPinIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useUserLocation } from '../hooks/useUserLocation';
import { filterMajlisByDistance, getDistanceText } from '../utils/locationUtils';

const AllMajlisPage: React.FC = () => {
  const [majlisList, setMajlisList] = useState<any[]>([]);
  const [filteredMajlis, setFilteredMajlis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedSortOption, setSelectedSortOption] = useState('date_asc');
  const [locationFilterEnabled, setLocationFilterEnabled] = useState(false);
  const [maxDistance, setMaxDistance] = useState(50);
  const [shareMessage, setShareMessage] = useState('');
  const [enlargedMajlis, setEnlargedMajlis] = useState<any | null>(null);
  const [currentPosterIndex, setCurrentPosterIndex] = useState(0);

  const { location, loading: locationLoading, error: locationError, requestLocation } = useUserLocation();
  const { user } = useAuth();

  // Complete list of Malaysian states and federal territories
  const malaysianStates = [
    'Johor',
    'Kedah',
    'Kelantan',
    'Kuala Lumpur',
    'Labuan',
    'Melaka',
    'Negeri Sembilan',
    'Pahang',
    'Penang',
    'Perak',
    'Perlis',
    'Putrajaya',
    'Sabah',
    'Sarawak',
    'Selangor',
    'Terengganu'
  ];

  const categories = ['Al-Quran', 'Hadith', 'Fiqh', 'Sirah', 'Majlis Ilmu', 'Majlis Zikir'];

  // Helper function to parse location display
  const parseLocationDisplay = (majlis: any) => {
    let primaryLocation = '';
    let secondaryAddress = '';

    // First priority: Check if venue field is provided
    if (majlis.venue && majlis.venue.trim()) {
      primaryLocation = majlis.venue.trim();
      
      // For secondary address, use the full address or city/state
      if (majlis.address && majlis.address.trim()) {
        secondaryAddress = majlis.address.trim();
      } else if (majlis.city) {
        secondaryAddress = `${majlis.city}${majlis.state ? ', ' + majlis.state : ''}`;
      }
      
      return { primaryLocation, secondaryAddress };
    }

    // Second priority: Parse address for place names
    if (majlis.address) {
      // Check if address starts with a place name (non-numeric, followed by comma)
      const addressParts = majlis.address.split(', ');
      const firstPart = addressParts[0].trim();
      
      // If first part doesn't start with a number and contains words like "Masjid", "Surau", etc.
      // or if it's clearly a place name (not starting with numbers/street indicators)
      if (!firstPart.match(/^\d+/) && 
          (firstPart.toLowerCase().includes('masjid') || 
           firstPart.toLowerCase().includes('surau') || 
           firstPart.toLowerCase().includes('kompleks') ||
           firstPart.toLowerCase().includes('dewan') ||
           firstPart.toLowerCase().includes('pusat') ||
           firstPart.toLowerCase().includes('sekolah') ||
           firstPart.toLowerCase().includes('universiti') ||
           addressParts.length > 1)) {
        
        primaryLocation = firstPart;
        secondaryAddress = addressParts.slice(1).join(', ');
      } else {
        // If no clear place name, use city/state as primary
        if (majlis.city) {
          primaryLocation = `${majlis.city}${majlis.state ? ', ' + majlis.state : ''}`;
          secondaryAddress = majlis.address;
        } else {
          primaryLocation = majlis.address;
          secondaryAddress = '';
        }
      }
    } else if (majlis.city) {
      primaryLocation = `${majlis.city}${majlis.state ? ', ' + majlis.state : ''}`;
      secondaryAddress = '';
    }

    return { primaryLocation, secondaryAddress };
  };

  useEffect(() => {
    const fetchAllMajlis = async () => {
      try {
        // Check if database is configured
        if (!database) {
          console.error('Database not configured')
          setLoading(false)
          return
        }

        const { data, error } = await database.getAllMajlis();
        if (data) {
          setMajlisList(data);
          setFilteredMajlis(data);
        } else if (error) {
          console.error('Error fetching majlis:', error);
        }
      } catch (err) {
        console.error('Unexpected error fetching majlis:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMajlis();
  }, []);

  // Filter majlis based on search and filters
  useEffect(() => {
    let filtered = majlisList;

    // First filter to show only upcoming majlis (with 2-hour grace period)
    filtered = filtered.filter(majlis => isUpcoming(majlis.start_date, majlis.time));

    // Location-based filtering
    if (locationFilterEnabled && location) {
      filtered = filterMajlisByDistance(
        filtered,
        location.latitude,
        location.longitude,
        maxDistance
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(majlis =>
        majlis.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        majlis.speaker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (majlis.city && majlis.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (majlis.state && majlis.state.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(majlis =>
        majlis.category && majlis.category.includes(selectedCategory)
      );
    }

    // City filter
    if (selectedState) {
      filtered = filtered.filter(majlis =>
        majlis.state && majlis.state.toLowerCase().includes(selectedState.toLowerCase())
      );
    }

    setFilteredMajlis(filtered);

    // Dynamic Sorting Logic
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (selectedSortOption) {
        case 'date_asc':
          const dateA_asc = new Date(a.start_date);
          const dateB_asc = new Date(b.start_date);
          comparison = dateA_asc.getTime() - dateB_asc.getTime();
          if (comparison === 0) { // If dates are the same, sort by time
            const timeA_asc = parseTimeToMinutes(a.time);
            const timeB_asc = parseTimeToMinutes(b.time);
            comparison = timeA_asc - timeB_asc;
          }
          break;
        case 'date_desc':
          const dateA_desc = new Date(a.start_date);
          const dateB_desc = new Date(b.start_date);
          comparison = dateB_desc.getTime() - dateA_desc.getTime();
          if (comparison === 0) { // If dates are the same, sort by time
            const timeA_desc = parseTimeToMinutes(a.time);
            const timeB_desc = parseTimeToMinutes(b.time);
            comparison = timeB_desc - timeA_desc;
          }
          break;
        case 'city_asc':
          comparison = (a.city || '').localeCompare(b.city || '');
          break;
        case 'city_desc':
          comparison = (b.city || '').localeCompare(a.city || '');
          break;
        case 'state_asc':
          comparison = (a.state || '').localeCompare(b.state || '');
          break;
        case 'state_desc':
          comparison = (b.state || '').localeCompare(a.state || '');
          break;
        case 'category_asc':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'category_desc':
          comparison = (b.category || '').localeCompare(a.category || '');
          break;
        default:
          // Default to date ascending if no valid option is selected
          const defaultDateA = new Date(a.start_date);
          const defaultDateB = new Date(b.start_date);
          comparison = defaultDateA.getTime() - defaultDateB.getTime();
          if (comparison === 0) {
            const defaultTimeA = parseTimeToMinutes(a.time);
            const defaultTimeB = parseTimeToMinutes(b.time);
            comparison = defaultTimeA - defaultTimeB;
          }
          break;
      }
      return comparison;
    });

    setFilteredMajlis(filtered);
  }, [searchTerm, selectedCategory, selectedState, majlisList, selectedSortOption, locationFilterEnabled, location, maxDistance]);

  // Helper function to parse time string to minutes for sorting
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    
    // Handle "HH:MM" format (24-hour) - this is how time is stored in database
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      return hours * 60 + minutes;
    }
    
    // Handle "HH:MM AM/PM" format as fallback
    const timeMatchAmPm = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatchAmPm) {
      let hours = parseInt(timeMatchAmPm[1]);
      const minutes = parseInt(timeMatchAmPm[2]);
      const period = timeMatchAmPm[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return hours * 60 + minutes;
    }
    
    return 0;
  };

  const isUpcoming = (date: string, time?: string) => {
    if (!date) return false;
    
    // Parse the majlis date and time
    const majlisDate = new Date(date);
    
    if (time) {
      // Handle "HH:MM" format (24-hour) - this is how time is stored in database
      const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        majlisDate.setHours(hours, minutes, 0, 0);
      } else {
        // Handle "HH:MM AM/PM" format as fallback
        const timeMatchAmPm = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatchAmPm) {
          let hours = parseInt(timeMatchAmPm[1]);
          const minutes = parseInt(timeMatchAmPm[2]);
          const period = timeMatchAmPm[3].toUpperCase();
          
          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          majlisDate.setHours(hours, minutes, 0, 0);
        } else {
          // If time format is unrecognized, assume end of day
          majlisDate.setHours(23, 59, 59, 999);
        }
      }
    } else {
      // If no time specified, assume end of day
      majlisDate.setHours(23, 59, 59, 999);
    }
    
    // Current time
    const now = new Date();
    
    // Check if majlis is upcoming
    const isUpcomingResult = now < majlisDate;
    
    return isUpcomingResult;
  };

  const handleShare = async (majlis: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get detailed location information
    const { primaryLocation, secondaryAddress } = parseLocationDisplay(majlis);
    
    // Construct comprehensive location string
    let locationText = 'TBA';
    if (primaryLocation) {
      locationText = primaryLocation;
      if (secondaryAddress) {
        locationText += `\n📍 Address: ${secondaryAddress}`;
      }
    } else if (majlis.address && majlis.address.trim()) {
      locationText = majlis.address.trim();
    } else if (majlis.city) {
      locationText = `${majlis.city}${majlis.state ? ', ' + majlis.state : ''}`;
    }
    
    const shareText = `🕌 ${majlis.title}\n\n` +
      `📢 Speaker: ${majlis.speaker}\n` +
      `📅 Date: ${majlis.start_date ? new Date(majlis.start_date).toLocaleDateString('ms-MY', {
       weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) : 'TBA'}\n` +
      `⏰ Time: ${majlis.time || 'TBA'}\n` +
      `📍 Location: ${locationText}\n` +
      `👥 Audience: ${majlis.audience || 'All'}\n\n` +
      `Join us for this Islamic learning session! 🤲\n\n` +
      `#themajlis #majlisilmu #islamiclearning`;

    try {
      // Try Web Share API first (mobile devices)
      if (navigator.share) {
        await navigator.share({
          title: `The Majlis - ${majlis.title}`,
          text: shareText,
          url: window.location.href
        });
        setShareMessage('Shared successfully! 📤');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText);
        setShareMessage('Copied to clipboard! 📋');
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setShareMessage(''), 3000);
    } catch (err) {
      console.error('Error sharing:', err);
      setShareMessage('Share failed. Please try again.');
      setTimeout(() => setShareMessage(''), 3000);
    }
  };


  const handlePosterClick = (majlis: any, initialIndex: number = 0) => {
    setEnlargedMajlis(majlis);
    setCurrentPosterIndex(initialIndex);
  };

  const closePosterModal = () => {
    setEnlargedMajlis(null);
    setCurrentPosterIndex(0);
  };

  // Helper function to get poster URLs as an array
  const getPosterUrls = (posterUrl: any): string[] => {
    if (!posterUrl) return [];
    
    // If it's already an array, clean each URL and return
    if (Array.isArray(posterUrl)) {
      return posterUrl.filter(url => url && typeof url === 'string').map(url => {
        // Clean each URL
        let cleanUrl = url.trim();
        // Remove duplicate 'public/' from URLs
        cleanUrl = cleanUrl.replace('/eventposters/public/', '/eventposters/');
        // Ensure the URL starts with https:// if it's a Supabase URL
        if (cleanUrl.includes('.supabase.co') && !cleanUrl.startsWith('http')) {
          cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
        }
        return cleanUrl;
      });
    }
    
    // Handle string input
    let url = posterUrl.toString();
    
    // Handle stringified JSON arrays like '["url1", "url2"]'
    if (url.startsWith('["') && url.endsWith('"]')) {
      try {
        const parsedArray = JSON.parse(url);
        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          return getPosterUrls(parsedArray); // Recursively process the parsed array
        }
      } catch (e) {
        console.error('Failed to parse stringified array URL:', url, e);
        return []; // Return empty array if parsing fails
      }
    }
    
    // Handle cases where JSON array is embedded within the URL
    if (url.includes('["') && url.includes('"]')) {
      try {
        const jsonStart = url.indexOf('["');
        const jsonEnd = url.indexOf('"]') + 2;
        const jsonPart = url.substring(jsonStart, jsonEnd);
        
        const parsedArray = JSON.parse(jsonPart);
        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          return getPosterUrls(parsedArray); // Recursively process the parsed array
        }
      } catch (e) {
        console.error('Failed to parse embedded JSON array from URL:', url, e);
        // Continue with original URL if parsing fails
      }
    }
    
    // Single URL - clean and return as array
    let cleanUrl = url.trim();
    // Remove duplicate 'public/' from URLs
    cleanUrl = cleanUrl.replace('/eventposters/public/', '/eventposters/');
    // Ensure the URL starts with https:// if it's a Supabase URL
    if (cleanUrl.includes('.supabase.co') && !cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
    }
    
    return [cleanUrl];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Share Message */}
        {shareMessage && (
          <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            {shareMessage}
          </div>
        )}
        

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          {/* Location Filter Toggle */}
          <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MapPinIcon className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-gray-700">Show majlis near me</span>
              </div>
              <button
                onClick={() => {
                  if (!locationFilterEnabled && !location) {
                    requestLocation();
                  }
                  setLocationFilterEnabled(!locationFilterEnabled);
                }}
                className="flex items-center space-x-1"
              >
                {locationFilterEnabled ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>
            
            {locationFilterEnabled && (
              <div className="space-y-2">
                {locationLoading && (
                  <p className="text-sm text-gray-500">Getting your location...</p>
                )}
                {locationError && (
                  <div className="text-sm text-red-600">
                    {locationError}
                    <button
                      onClick={requestLocation}
                      className="ml-2 text-emerald-600 hover:text-emerald-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}
                {location && (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-green-600">✓ Location enabled</span>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Within:</label>
                      <select
                        value={maxDistance}
                        onChange={(e) => setMaxDistance(Number(e.target.value))}
                        className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
                      >
                        <option value={10}>10km</option>
                        <option value={25}>25km</option>
                        <option value={50}>50km</option>
                        <option value={100}>100km</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search majlis, speaker, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 appearance-none"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            {/* State Filter */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 appearance-none"
              >
                <option value="">All States</option>
                {malaysianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <ListOrdered className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedSortOption}
                onChange={(e) => setSelectedSortOption(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 appearance-none"
              >
                <option value="date_asc">Date (Ascending)</option>
                <option value="date_desc">Date (Descending)</option>
                <option value="city_asc">City (A-Z)</option>
                <option value="city_desc">City (Z-A)</option>
                <option value="state_asc">State (A-Z)</option>
                <option value="state_desc">State (Z-A)</option>
                <option value="category_asc">Category (A-Z)</option>
                <option value="category_desc">Category (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedCategory || selectedState || selectedSortOption !== 'date_asc' || locationFilterEnabled) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedState('');
                  setSelectedSortOption('date_asc');
                  setLocationFilterEnabled(false);
                }}
                className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors duration-200"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Majlis List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading majlis...</p>
            </div>
          ) : filteredMajlis.length > 0 ? (
            filteredMajlis.map((majlis) => (
              <div
                key={majlis.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-200 transition-all duration-300"
              >
                <div className="grid md:grid-cols-4 gap-4">
                  {/* Poster */}
                  <div className="md:col-span-1">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 aspect-square flex items-center justify-center relative group">
                      {(() => {
                        const posterUrls = getPosterUrls(majlis.poster_url);
                        return posterUrls.length > 0 ? (
                        <div className="relative w-full h-full">
                          {/* Display first poster */}
                          <img
                            src={posterUrls[0]}
                            alt={`${majlis.title} poster`}
                            className="max-w-full max-h-full object-contain rounded-lg cursor-pointer transition-transform duration-300 group-hover:scale-105"
                            onClick={() => handlePosterClick(majlis, 0)}
                            onError={(e) => {
                              console.error('Failed to load poster. URL:', posterUrls[0]);
                              console.error('Error details:', e);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.error-message')) {
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'error-message text-center';
                                errorDiv.innerHTML = `
                                  <div class="w-10 h-10 bg-red-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                    <span class="text-xl">❌</span>
                                  </div>
                                  <span class="text-red-500 text-xs">Failed to load</span>
                                `;
                                parent.appendChild(errorDiv);
                              }
                            }}
                            onLoad={(e) => {
                              console.log('Poster loaded successfully. URL:', posterUrls[0]);
                            }}
                          />
                          {/* Multiple poster indicator */}
                          {posterUrls.length > 1 && (
                            <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                              +{posterUrls.length - 1}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center cursor-pointer"
                               onClick={() => handlePosterClick(majlis, 0)}>
                            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        </div>
                        ) : (
                        <div className="text-center">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                            <span className="text-2xl">🖼️</span>
                          </div>
                          <span className="text-gray-500 text-xs">No poster</span>
                        </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="md:col-span-3">
                    <div className="mb-3">
                      <div className="flex-1 min-w-0">
                        {/* Status Badge */}
                        <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium mb-2 ${
                          isUpcoming(majlis.start_date, majlis.time)
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {isUpcoming(majlis.start_date, majlis.time) ? 'Upcoming' : 'Completed'}
                        </span>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 break-words">{majlis.title}</h3>
                        <p className="text-gray-700 font-medium mb-2 break-words">{majlis.speaker}</p>
                        
                        {/* Distance indicator */}
                        {majlis.distance !== undefined && majlis.distance !== null && (
                          <div className="flex items-center mb-2">
                            <MapPinIcon className="w-4 h-4 mr-2 text-emerald-600" />
                            <span className="text-sm text-emerald-600 font-medium">
                              {getDistanceText(majlis.distance)}
                            </span>
                          </div>
                        )}
                        
                        {/* Categories */}
                        {majlis.category && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {majlis.category.split(', ').map((cat: string, index: number) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Address */}
                        {(majlis.address || majlis.city) && (
                          <div className="text-sm text-gray-600 break-words">
                            {(() => {
                              const { primaryLocation, secondaryAddress } = parseLocationDisplay(majlis);
                              
                              if (primaryLocation) {
                                return (
                                  <>
                                    <div className="font-medium text-gray-900 break-words">
                                      {primaryLocation}
                                    </div>
                                    {secondaryAddress && (
                                      <div className="text-gray-500 mt-0.5 text-xs break-words">{secondaryAddress}</div>
                                    )}
                                  </>
                                );
                              } else {
                                return <span className="text-gray-400 text-xs">No location</span>;
                              }
                            })()}
                          </div>
                        )}

                        {/* Date, Time, Location */}
                        <div className="space-y-1 text-sm text-gray-600 break-words">
                          <div className="flex items-center">
                            <img src="/kubahnew.png" alt="kubahnew.png" className="w-4 h-4 mr-2" />
                            <span>
                              {majlis.start_date && new Date(majlis.start_date).toLocaleDateString('ms-MY', {
                               weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                            {majlis.time && (
                              <>
                                <Clock className="w-4 h-4 ml-4 mr-2" />
                                <span>{majlis.time}</span>
                              </>
                            )}
                          </div>
                          {/* Audience */}
                          {majlis.audience && (
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              <span className="break-words">{majlis.audience}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={(e) => handleShare(majlis, e)}
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded-lg transition-colors duration-200"
                          title="Share this majlis"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Share</span>
                        </button>
                      
                      {(majlis.address || majlis.city) && (
                        <>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            majlis.address || `${majlis.city}${majlis.state ? ', ' + majlis.state : ''}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded-lg transition-colors duration-200"
                          title="Open in Google Maps"
                        >
                          <Map className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Maps</span>
                        </a>
                        <a
                          href={`https://waze.com/ul?q=${encodeURIComponent(
                            majlis.address || `${majlis.city}${majlis.state ? ', ' + majlis.state : ''}`
                          )}&navigate=yes`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded-lg transition-colors duration-200"
                          title="Open in Waze"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Waze</span>
                        </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <img src="/kubahnew.png" alt="kubahnew.png" className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No majlis found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedCategory || selectedState
                  ? 'Try adjusting your search or filters'
                  : locationFilterEnabled && location
                    ? `No majlis found within ${maxDistance}km of your location`
                    : 'No majlis available at the moment'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enlarged Poster Modal */}
      {enlargedMajlis && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            {(() => {
              const posterUrls = getPosterUrls(enlargedMajlis.poster_url);
              if (posterUrls.length === 0) return null;
              
              return (
                <>
            {/* Close Button */}
            <button
              onClick={closePosterModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors duration-200 z-10 bg-black bg-opacity-50 rounded-full p-2"
            >
              <X className="w-8 h-8" />
            </button>
            
                  {/* Navigation Buttons */}
                  {posterUrls.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPosterIndex(Math.max(0, currentPosterIndex - 1))}
                        disabled={currentPosterIndex === 0}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors duration-200 z-10 bg-black bg-opacity-50 rounded-full p-3 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentPosterIndex(Math.min(posterUrls.length - 1, currentPosterIndex + 1))}
                        disabled={currentPosterIndex === posterUrls.length - 1}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors duration-200 z-10 bg-black bg-opacity-50 rounded-full p-3 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
            
            {/* Poster Image */}
            <div className="bg-white rounded-2xl p-4 shadow-2xl">
                    {/* Image Counter */}
                    {posterUrls.length > 1 && (
                      <div className="text-center mb-2">
                        <span className="text-sm text-gray-600">
                          {currentPosterIndex + 1} of {posterUrls.length}
                        </span>
                      </div>
                    )}
                    
              <img
                        src={posterUrls[currentPosterIndex]}
                alt={`${enlargedMajlis.title} poster`}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              
              {/* Majlis Info Below Poster */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 break-words">
                  {enlargedMajlis.title}
                </h3>
                <p className="text-gray-700 text-sm mb-2 break-words">
                  Speaker: {enlargedMajlis.speaker}
                </p>
                <div className="flex items-center text-sm text-gray-600">
                  <img src="/kubahnew.png" alt="kubahnew.png" className="w-4 h-4 mr-2" />
                  <span>
                    {enlargedMajlis.start_date && new Date(enlargedMajlis.start_date).toLocaleDateString('ms-MY', {
                     weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                    {enlargedMajlis.time && ` • ${enlargedMajlis.time}`}
                  </span>
                </div>
              </div>
            </div>
                </>
              );
            })()}
          </div>
          
          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={closePosterModal}
          ></div>
        </div>
      )}
    </div>
  );
};

export default AllMajlisPage;