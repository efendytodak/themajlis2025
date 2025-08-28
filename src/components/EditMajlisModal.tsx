import React, { useState, useEffect } from 'react';
import { X, Save, Clock, User, Tag, MapPin, Calendar } from 'lucide-react';
import { database } from '../lib/supabase';
import PlacesAutocomplete from './PlacesAutocomplete';

interface EditMajlisModalProps {
  majlis: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const EditMajlisModal: React.FC<EditMajlisModalProps> = ({ majlis, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: '',
    speaker: '',
    categories: [] as string[],
    venue: '',
    location: '',
    address: '',
    city: '',
    state: '',
    latitude: null as number | null,
    longitude: null as number | null,
    startDate: '',
    endDate: '',
    time: '',
    posterFiles: [] as File[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [posterPreviews, setPosterPreviews] = useState<string[]>([]);
  const [isMultiDayEvent, setIsMultiDayEvent] = useState(false);

  const categories = [
    'Al-Quran',
    'Hadith',
    'Fiqh',
    'Sirah',
    'Majlis Ilmu',
    'Majlis Zikir'
  ];

  useEffect(() => {
    if (majlis && isOpen) {
      // majlis.poster_url will already be an array of public URLs from the DB
      const initialPosterUrls = Array.isArray(majlis.poster_url) ? majlis.poster_url : (majlis.poster_url ? [majlis.poster_url] : []);
      
      // Parse time to extract hour, minute and period
      let timeValue = '';
      
      if (majlis.time) {
        const timeStr = majlis.time.toString();
        // Remove AM/PM if present and just use the time part
        timeValue = timeStr.replace(/\s*(AM|PM)\s*/i, '');
      }

      setFormData({
        title: majlis.title || '',
        speaker: majlis.speaker || '',
        categories: majlis.category ? majlis.category.split(', ') : [],
        venue: majlis.venue || '',
        location: majlis.address || `${majlis.city || ''}${majlis.state ? ', ' + majlis.state : ''}`,
        address: majlis.address || '',
        city: majlis.city || '',
        state: majlis.state || '',
        latitude: majlis.latitude || null,
        longitude: majlis.longitude || null,
        startDate: majlis.start_date || '', // Changed from date to startDate
        endDate: majlis.end_date || '', // Added endDate
        time: timeValue,
        posterFiles: [] // No files initially selected for edit
      });
      
      setPosterPreviews(initialPosterUrls); // Display existing public URLs as previews

      // Determine if it's a multi-day event
      setIsMultiDayEvent(majlis.start_date && majlis.end_date && majlis.start_date !== majlis.end_date);

      setSubmitMessage('');
    }
  }, [majlis, isOpen]);

  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleLocationSelect = (place: {
    address: string;
    city: string;
    state: string;
    formatted_address: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      location: place.formatted_address,
      address: place.address,
      city: place.city,
      state: place.state,
      latitude: place.latitude || null,
      longitude: place.longitude || null
    }));
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      
      // Check file sizes before processing
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      const oversizedFiles = fileArray.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        setSubmitMessage(`Error: Some files are too large. Please select images smaller than 5MB. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
        // Clear the input if there are oversized files
        e.target.value = '';
        setFormData(prev => ({ ...prev, posterFiles: [] }));
        setPosterPreviews([]); // Clear previews if new files are invalid
        return;
      }
      
      setFormData(prev => ({ ...prev, posterFiles: fileArray }));
      
      // Create local previews for all files using URL.createObjectURL
      const previews: string[] = fileArray.map(file => URL.createObjectURL(file));
      setPosterPreviews(previews);

    } else {
      setFormData(prev => ({ ...prev, posterFiles: [] }));
      // If no new files selected, revert to original poster URLs from majlis prop
      const initialPosterUrls = Array.isArray(majlis.poster_url) ? majlis.poster_url : (majlis.poster_url ? [majlis.poster_url] : []);
      setPosterPreviews(initialPosterUrls);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage('');
    
    // Validate required fields
    if (!formData.title.trim()) {
      setSubmitMessage('Please enter a title for the majlis');
      return;
    }
    
    if (!formData.speaker.trim()) {
      setSubmitMessage('Please enter the speaker name');
      return;
    }
    
    if (formData.categories.length === 0) {
      setSubmitMessage('Please select at least one category');
      return;
    }
    
    if (!formData.startDate) { // Changed from date to startDate
      setSubmitMessage('Please select a date');
      return;
    }
    
    if (!formData.time) {
      setSubmitMessage('Please select a time');
      return;
    }

    // Validate end date if it's a multi-day event
    if (isMultiDayEvent && !formData.endDate) {
      setSubmitMessage('Please select an end date for multi-day event');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Create the update data object
      const updateData: { poster_files?: File[]; [key: string]: any } = {
        title: formData.title.trim(),
        speaker: formData.speaker.trim(),
        category: formData.categories.join(', '),
        venue: formData.venue.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        start_date: formData.startDate, // Changed from date to start_date
        end_date: isMultiDayEvent ? formData.endDate : formData.startDate, // Set end_date
        time: formData.time,
        poster_files: formData.posterFiles, // Pass the actual File objects
      };
      
      const { data, error } = await database.updateMajlis(majlis.id, updateData);
      
      if (error) {
        setSubmitMessage(`Error: ${error.message}`);
      } else {
        setSubmitMessage('Majlis updated successfully!');
        setTimeout(() => {
          onUpdate();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setSubmitMessage('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Edit Majlis</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-emerald-200 transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {submitMessage && (
            <div className={`p-4 rounded-2xl ${
              submitMessage.includes('Error') || submitMessage.includes('Please') 
                ? 'bg-red-50 border border-red-200 text-red-700' 
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {submitMessage}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-gray-800 font-semibold mb-3 text-lg">
              Tajuk Majlis <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300"
                placeholder="Masukkan tajuk majlis..."
                required
              />
            </div>
          </div>

          {/* Speaker */}
          <div>
            <label className="block text-gray-800 font-semibold mb-3 text-lg">
              Penceramah <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.speaker}
                onChange={(e) => setFormData(prev => ({ ...prev, speaker: e.target.value }))}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300"
                placeholder="Nama penceramah..."
                required
              />
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-gray-800 font-semibold mb-3 text-lg">
              Kategori <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((category) => (
                <label
                  key={category}
                  className="flex items-center space-x-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all duration-300"
                >
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category)}
                    onChange={() => handleCategoryChange(category)}
                    className="w-5 h-5 text-emerald-600 border-2 border-gray-300 rounded-lg focus:ring-emerald-500"
                  />
                  <span className="text-gray-800 font-medium">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-gray-800 font-semibold mb-3 text-lg">
              Venue <span className="text-gray-500">(Optional)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300"
                placeholder="e.g., Masjid Muadz bin Jabal, Surau Al-Hidayah, Dewan Komuniti..."
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 ml-1">
              Enter the specific name of the venue (mosque, surau, hall, etc.)
            </p>
          </div>

          {/* Location Search */}
          <div>
            <label className="block text-gray-800 font-semibold mb-3 text-lg">
              Address (Optional)
            </label>
            <div>
              <PlacesAutocomplete
                onPlaceSelect={handleLocationSelect}
                placeholder="Search for a location (e.g., Kuala Lumpur, Shah Alam...)"
                value={formData.location}
              />
              <p className="text-sm text-gray-500 mt-2 ml-1">
                Start typing to search for cities and locations
              </p>
              {formData.city && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm text-emerald-700">
                    <strong>Selected:</strong> {formData.city}{formData.state && `, ${formData.state}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Poster Upload */}
          <div>
            <label className="block text-gray-800 font-semibold mb-3 text-lg">
              Poster Majlis (Optional)
            </label>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePosterChange}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2 ml-1">Upload poster images (JPG, PNG, etc.) - Multiple files allowed</p>
              </div>
              
              {posterPreviews.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Preview{posterPreviews.length > 1 ? 's' : ''} ({posterPreviews.length} image{posterPreviews.length > 1 ? 's' : ''}):
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {posterPreviews.map((preview, index) => (
                      <img
                        key={index}
                        src={preview}
                        alt={`Poster preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-xl border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <label className="block text-gray-800 font-semibold text-lg">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-3 mb-2">
              <input
                type="checkbox"
                id="multiDayEventEdit"
                checked={isMultiDayEvent}
                onChange={(e) => setIsMultiDayEvent(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-2 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="multiDayEventEdit" className="text-gray-700 text-sm font-medium">
                This is a multi-day event
              </label>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Start Date */}
              <div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300"
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2 ml-1">Start Date</p>
              </div>
              
              {/* End Date (conditionally rendered) */}
              {isMultiDayEvent && (
                <div>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300"
                      required={isMultiDayEvent}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2 ml-1">End Date</p>
                </div>
              )}

              {/* Time */}
              <div>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 appearance-none"
                    required
                  >
                    <option value="">Select time</option>
                    {Array.from({ length: 48 }, (_, i) => {
                      const hours = Math.floor(i / 2);
                      const minutes = (i % 2) * 30;
                      const timeValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      
                      // Convert to 12-hour format for display
                      let displayHours = hours;
                      let period = 'AM';
                      
                      if (hours === 0) {
                        displayHours = 12;
                      } else if (hours === 12) {
                        period = 'PM';
                      } else if (hours > 12) {
                        displayHours = hours - 12;
                        period = 'PM';
                      }
                      
                      const displayTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
                      
                      return (
                        <option key={timeValue} value={timeValue}>
                          {displayTime}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <p className="text-sm text-gray-500 mt-2 ml-1">Time</p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-2xl transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-3 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Updating...' : 'Update Majlis'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMajlisModal;