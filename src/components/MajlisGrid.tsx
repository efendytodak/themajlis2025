import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Map, Navigation, Share2, MapPinIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useUserLocation } from '../hooks/useUserLocation';
import { filterMajlisByDistance, getDistanceText } from '../utils/locationUtils';

const MajlisGrid: React.FC = () => {
  const [majlisList, setMajlisList] = React.useState<any[]>([]);
  const [filteredMajlisList, setFilteredMajlisList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [locationFilterEnabled, setLocationFilterEnabled] = React.useState(false);
  const [maxDistance, setMaxDistance] = React.useState(50); // Default 50km
  const [selectedMajlis, setSelectedMajlis] = React.useState<any | null>(null);
  const [shareMessage, setShareMessage] = React.useState('');
  const posterSectionRef = React.useRef<HTMLDivElement>(null);
  
  const { location, loading: locationLoading, error: locationError, requestLocation, hasPermission } = useUserLocation();
  const { user } = useAuth();

  // Helper function to parse time string to minutes for sorting
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    
    // Handle "HH:MM" format (24-hour)
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      return hours * 60 + minutes;
    }
    
    // Handle "HH:MM AM/PM" format
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

  // Helper function to check if majlis is upcoming
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
    return now < majlisDate;
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

  // Helper function for backward compatibility - returns first URL or empty string
  const getFirstPosterUrl = (posterUrl: any): string => {
    const urls = getPosterUrls(posterUrl);
    return urls.length > 0 ? urls[0] : '';
  };

  React.useEffect(() => {
    const fetchMajlis = async () => {
        try {
        // Check if Supabase is configured
        if (!database) {
          console.warn('Database not configured - Supabase environment variables may be missing');
          setLoading(false);
          return;
        }

        // Check if Supabase is configured
        if (!database) {
          console.error('Database not configured');
          setLoading(false);
          return;
        }

        const { data, error } = await database.getAllMajlis();
        if (data) {
          // Filter upcoming majlis with 2-hour grace period
          const upcoming = data.filter(majlis => isUpcoming(majlis.start_date, majlis.time));
          
          // Sort by date ascending, then by time ascending (nearest date and time first)
          const sortedUpcoming = upcoming.sort((a, b) => {
            const dateA = new Date(a.start_date);
            const dateB = new Date(b.start_date);
            const dateComparison = dateA.getTime() - dateB.getTime();
            
            // If dates are the same, sort by time
            if (dateComparison === 0) {
              const timeA = parseTimeToMinutes(a.time || '');
              const timeB = parseTimeToMinutes(b.time || '');
              return timeA - timeB;
            }
            
            return dateComparison;
          });
          
          setMajlisList(sortedUpcoming);
          setFilteredMajlisList(sortedUpcoming);
        } else if (error) {
          // Handle different types of errors
          if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            console.warn('Network connection issue - unable to fetch majlis data');
          } else {
            console.error('Error fetching majlis:', error);
          }
        }
      } catch (err) {
        // Handle network and connection errors gracefully
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          console.warn('Network connection issue - unable to connect to database');
        } else {
          console.error('Unexpected error fetching majlis:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMajlis();
  }, []);

  // Apply location filtering when location or filter settings change
  React.useEffect(() => {
    if (locationFilterEnabled && location) {
      const filtered = filterMajlisByDistance(
        majlisList,
        location.latitude,
        location.longitude,
        maxDistance
      );
      setFilteredMajlisList(filtered);
    } else {
      setFilteredMajlisList(majlisList);
    }
  }, [majlisList, locationFilterEnabled, location, maxDistance]);
  // Scroll to poster section when a majlis is selected
  React.useEffect(() => {
    if (selectedMajlis && posterSectionRef.current) {
      posterSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [selectedMajlis]);

  const handleMajlisClick = (majlis: any) => {
    setSelectedMajlis(majlis);
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

  return (
    <section className="py-0 px-6 bg-gray">
      <div className="container mx-auto">
        {/* Share Message */}
        {shareMessage && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium">
            {shareMessage}
          </div>
        )}
        
        <div className="text-center mb-10">
        
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Senarai Majlis */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:shadow-lg transition-all duration-500 flex flex-col">
            <div className="flex items-center mb-2">
              <div className="p-2 rounded-xl mr-3">
                <img src="/iconpng.png" alt="iconpng.png" className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-600">Akan Datang</h3>
              </div>
            </div>
            
            <div className="space-y-3 flex-grow">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading majlis...</p>
                </div>
              ) : (
                <>
                  {/* Location Filter Controls */}
                  <div className="bg-gray-100 rounded-xl p-3 mb-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-gray-700">Location Filter</span>
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
                          <ToggleRight className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    
                    {locationFilterEnabled && (
                      <div className="space-y-2">
                        {locationLoading && (
                          <p className="text-xs text-gray-500">Getting your location...</p>
                        )}
                        {locationError && (
                          <div className="text-xs text-red-600">
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
                          <div className="space-y-2">
                            <p className="text-xs text-green-600">✓ Location enabled</p>
                            <div className="flex items-center space-x-2">
                              <label className="text-xs text-gray-600">Radius:</label>
                              <select
                                value={maxDistance}
                                onChange={(e) => setMaxDistance(Number(e.target.value))}
                                className="text-xs px-2 py-1 border border-gray-300 rounded"
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
                  
                  {filteredMajlisList.length > 0 ? (
                <div className="h-[500px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-gray-100">
                    {filteredMajlisList.slice(0, 5).map((majlis) => (
                    <div 
                      key={majlis.id} 
                      className="bg-white rounded-xl p-4 border border-gray-100 hover:border-emerald-200 transition-all duration-300 group cursor-pointer"
                      onClick={() => handleMajlisClick(majlis)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-gray-900 font-semibold text-base group-hover:text-emerald-600 transition-colors break-words min-w-0 flex-1 pr-2">
                          {majlis.title}
                        </h4>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      
                      {/* Speaker */}
                      {majlis.speaker && (
                        <p className="text-gray-700 mb-2 text-sm break-words">{majlis.speaker}</p>
                      )}
                      
                      {/* Distance indicator */}
                      {majlis.distance !== undefined && majlis.distance !== null && (
                        <div className="flex items-center mb-2">
                          <MapPinIcon className="w-3 h-3 mr-1 text-emerald-600" />
                          <span className="text-xs text-emerald-600 font-medium">
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
                              className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Date and Time */}
                      {(majlis.start_date || majlis.time) && (
                        <div className="flex items-center mb-2">
                          <Clock className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {majlis.start_date && new Date(majlis.start_date).toLocaleDateString('ms-MY', {
                             weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                            {majlis.start_date && majlis.time && ' • '}
                            {majlis.time}
                          </span>
                        </div>
                      )}
                      
                      {/* Address */}
                      {(majlis.address || majlis.city) && (
                        <div className="flex items-start mb-2">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                          <div className="text-xs text-gray-500 break-words min-w-0 flex-1">
                            {majlis.venue ? (
                              <div className="font-medium text-gray-700 break-words">
                                {majlis.venue}
                              </div>
                            ) : majlis.city && (
                              <div className="font-medium text-gray-700 break-words">
                                {majlis.city}{majlis.state ? `, ${majlis.state}` : ''}
                              </div>
                            )}
                            {majlis.address && (
                              <div className="text-gray-500 mt-0.5 text-xs break-words">
                                {majlis.venue ? majlis.address : majlis.address}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Targeted Audience */}
                      {majlis.audience && (
                        <div className="flex items-center mb-2">
                          <span className="text-xs text-gray-500 break-words">
                            👥 {majlis.audience}
                          </span>
                        </div>
                      )}
                    
                      {/* Navigation Icons */}
                      <div className="flex items-center space-x-2 mt-2">
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
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded-lg transition-colors duration-200"
                            title="Open in Google Maps"
                          >
                            <Map className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Maps</span>
                          </a>
                          <a
                            href={`https://waze.com/ul?q=${encodeURIComponent(
                              majlis.address || `${majlis.city}${majlis.state ? ', ' + majlis.state : ''}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
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
                  ))}
                </div>
                  ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <img src="/iconpng.png" alt="iconpng.png" className="w-10 h-10" />
                  </div>
                    <p className="text-gray-600 text-base">
                      {locationFilterEnabled && location 
                        ? `No majlis found within ${maxDistance}km of your location`
                        : 'No upcoming majlis available'
                      }
                    </p>
                </div>
                  )}
                </>
              )}
            </div>
            
            <div className="mt-4">
              <Link 
                to="/all-majlis"
                className="block w-full py-2 text-emerald-600 font-medium hover:bg-emerald-50 rounded-xl transition-all duration-300 text-center text-sm"
              >
                View All Majlis
              </Link>
            </div>
          </div>

          {/* Poster Majlis */}
          <div 
            ref={posterSectionRef}
            className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:shadow-lg transition-all duration-500"
          >
            <div className="flex items-center mb-2">
              <div className="p-2 rounded-xl mr-3">
                <img src="/iconpng.png" alt="iconpng.png" className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-600">Poster Majlis</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {selectedMajlis && (() => {
                const posterUrls = getPosterUrls(selectedMajlis.poster_url);
                return posterUrls.length > 0;
              })() ? (
                <div className="col-span-2 bg-white rounded-2xl p-4 border border-gray-100 h-[500px] flex items-center justify-center hover:border-emerald-200 transition-all duration-300 group overflow-y-auto">
                  {(() => {
                    const posterUrls = getPosterUrls(selectedMajlis.poster_url);
                    return posterUrls.length > 0 ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                          src={posterUrls[0]}
                          alt={`${selectedMajlis.title} poster`}
                          className="max-w-full max-h-full object-contain rounded-lg"
                          onError={(e) => {
                            console.error('Failed to load poster. URL:', posterUrls[0]);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.error-message')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'error-message text-center';
                              errorDiv.innerHTML = `
                                <div class="w-16 h-16 bg-red-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                  <span class="text-2xl">❌</span>
                                </div>
                               <span class="text-red-500 text-sm">Failed to load poster</span>
                              `;
                              parent.appendChild(errorDiv);
                            }
                          }}
                        />
                        {/* Multiple poster indicator */}
                        {posterUrls.length > 1 && (
                          <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                            {posterUrls.length} images
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="col-span-2 bg-white rounded-2xl p-6 border border-gray-100 h-[500px] flex items-center justify-center hover:border-emerald-200 transition-all duration-300 group">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-2xl">🖼️</span>
                    </div>
                    <span className="text-gray-500 text-sm text-center group-hover:text-emerald-600 transition-colors">
                      {selectedMajlis ? 'No poster available' : 'Click an event to view poster'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MajlisGrid;