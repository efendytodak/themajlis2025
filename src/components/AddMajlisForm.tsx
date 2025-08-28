import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, Tag, Save, MapPin, Users } from 'lucide-react';
import { database } from '../lib/supabase';
import PlacesAutocomplete from './PlacesAutocomplete';

const AddMajlisForm: React.FC = () => {
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
    audience: '',
    posterFiles: [] as File[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultiDayEvent, setIsMultiDayEvent] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [posterPreviews, setPosterPreviews] = useState<string[]>([]);

  const categories = [
    'Al-Quran',
    'Hadith',
    'Fiqh',
    'Sirah',
    'Majlis Ilmu',
    'Majlis Zikir',
    'Majlis Maulid'
  ];

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
        setPosterPreviews([]);
        return;
      }
      
      setFormData(prev => ({ ...prev, posterFiles: fileArray }));
      
      // Create local previews for all files using URL.createObjectURL
      const previews: string[] = fileArray.map(file => URL.createObjectURL(file));
      setPosterPreviews(previews);

    } else {
      setFormData(prev => ({ ...prev, posterFiles: [] }));
      setPosterPreviews([]);
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
    
    if (!formData.audience) {
      setSubmitMessage('Please select the targeted audience');
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

    // Validate that either venue or location is provided
    if (!formData.venue.trim() && !formData.city.trim() && !formData.address.trim()) {
      setSubmitMessage('Please provide either a venue name or select a location');
      return;
    }

    // Validate end date if it's a multi-day event
    if (isMultiDayEvent && !formData.endDate) {
      setSubmitMessage('Please select an end date for multi-day event');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Create the majlis data object
      const majlisData = {
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
        audience: formData.audience,
        poster_files: formData.posterFiles, // Pass the actual File objects
      };
      
      const { data, error } = await database.createMajlis(majlisData);
      
      if (error) {
        setSubmitMessage(`Error: ${error.message}`);
      } else {
        setSubmitMessage('Majlis berjaya disimpan!');
        
        // Reset form
        setFormData({
          title: '',
          speaker: '',
          categories: [],
          venue: '',
          address: '',
          city: '',
          state: '',
          latitude: null,
          longitude: null,
          startDate: '',
          endDate: '',
          time: '',
          period: 'AM',
          audience: '',
          posterFiles: [] // Clear file input
        });
        setPosterPreviews([]); // Clear previews
      }
    } catch (err) {
      setSubmitMessage('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 bg-gray-50">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 sm:mr-6 bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
         
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 sm:p-4">
            <h2 className="text-xl sm:text-2xl font-medium text-white text-center">Tambah Majlis</h2>
         
          </div>
          

          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6">
            {submitMessage && (
              <div className={`p-3 rounded-xl ${
                submitMessage.includes('Error') || submitMessage.includes('Please') 
                  ? 'bg-red-50 border border-red-200 text-red-700' 
                  : 'bg-green-50 border border-green-200 text-green-700'
              } text-sm`}>
                {submitMessage}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-base">
                Tajuk Majlis <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 text-sm"
                  placeholder="Masukkan tajuk majlis..."
                  required
                />
              </div>
            </div>

            {/* Speaker */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-base">
                Penceramah <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.speaker}
                  onChange={(e) => setFormData(prev => ({ ...prev, speaker: e.target.value }))}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 text-sm"
                  placeholder="Nama penceramah..."
                  required
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-base">
                Kategori <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <label
                    key={category}
                    className="flex items-center space-x-2 p-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all duration-300"
                  >
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                      className="w-4 h-4 text-emerald-600 border-2 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-gray-800 font-medium text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Targeted Audience */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-base">
                Targeted Audience <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {[
                  { value: 'Muslimin sahaja', label: 'Muslimin sahaja' },
                  { value: 'Muslimat sahaja', label: 'Muslimat sahaja' },
                  { value: 'Muslimin & Muslimat', label: 'Muslimin & Muslimat' }
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center space-x-3 p-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all duration-300"
                  >
                    <input
                      type="radio"
                      name="audience"
                      value={option.value}
                      checked={formData.audience === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value }))}
                      className="w-4 h-4 text-emerald-600 border-2 border-gray-300 focus:ring-emerald-500"
                    />
                    <span className="text-gray-800 font-medium text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-base">
                Venue <span className="text-gray-500">(Optional)</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 text-sm"
                  placeholder="e.g., Masjid Muadz bin Jabal, Surau Al-Hidayah, Dewan Komuniti..."
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-1">
                Enter the specific name of the venue (mosque, surau, hall, etc.)
              </p>
            </div>
            {/* Location Search */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-base">
                Location <span className="text-red-500">*</span>
              </label>
              <div>
                <PlacesAutocomplete
                  placeholder="Search for a location (e.g., Kuala Lumpur, Shah Alam...)"
                  value={formData.location}
                  onPlaceSelect={handleLocationSelect}
                />
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  Start typing to search for cities and locations
                </p>
                {formData.city && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs text-emerald-700">
                      <strong>Selected:</strong> {formData.city}{formData.state && `, ${formData.state}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Poster Upload */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-base">
                Poster Majlis <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePosterChange}
                      className="w-full px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">Upload poster images (JPG, PNG, etc.) - Multiple files allowed</p>
                </div>
                
                {posterPreviews.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Preview{posterPreviews.length > 1 ? 's' : ''} ({posterPreviews.length} image{posterPreviews.length > 1 ? 's' : ''}):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {posterPreviews.map((preview, index) => (
                        <img
                          key={index}
                          src={preview}
                          alt={`Poster preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Date and Time */}
            <div className="space-y-4">
              <label className="block text-gray-800 font-semibold text-base">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-3 mb-2">
                <input
                  type="checkbox"
                  id="multiDayEvent"
                  checked={isMultiDayEvent}
                  onChange={(e) => setIsMultiDayEvent(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-2 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="multiDayEvent" className="text-gray-700 text-sm font-medium">
                  This is a multi-day event
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Start Date */}
                <div>
                  <div className="relative">
                    <img src="/kubahnew.png" alt="kubahnew.png" className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" />
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 text-sm"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">Start Date</p>
                </div>
                
                {/* End Date (conditionally rendered) */}
                {isMultiDayEvent && (
                  <div>
                    <div className="relative">
                      <img src="/kubahnew.png" alt="kubahnew.png" className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" />
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 text-sm"
                        required={isMultiDayEvent}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-1">End Date</p>
                  </div>
                )}

                {/* Time */}
                <div>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-300 text-sm appearance-none"
                      required
                    >
                      <option value="">Select time</option>
                      {Array.from({ length: 48 }, (_, i) => {
                        const hours = Math.floor(i / 2);
                        const minutes = (i % 2) * 30;
                        const timeValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                        const displayTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                        return (
                          <option key={timeValue} value={timeValue}>
                            {displayTime}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">Time</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Save className="w-5 h-5" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Majlis'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMajlisForm;