import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, Plus, BarChart3, Users, BookOpen, TrendingUp } from 'lucide-react';
import { database } from '../lib/supabase';
import EditMajlisModal from './EditMajlisModal';

interface AdminDashboardProps {
  adminName: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminName }) => {
  const [userMajlis, setUserMajlis] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingMajlis, setEditingMajlis] = React.useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

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
  React.useEffect(() => {
    const fetchUserMajlis = async () => {
      try {
        const { data, error } = await database.getMajlisByUser();
        if (data) {
          setUserMajlis(data);
        }
      } catch (err) {
        console.error('Error fetching majlis:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserMajlis();
  }, []);

  const handleEditMajlis = (majlis: any) => {
    setEditingMajlis(majlis);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMajlis(null);
  };

  const handleUpdateMajlis = async () => {
    // Refresh the majlis list after update
    try {
      const { data, error } = await database.getMajlisByUser();
      if (data) {
        setUserMajlis(data);
      }
    } catch (err) {
      console.error('Error refreshing majlis:', err);
    }
  };

  const totalMajlis = userMajlis.length;
  const upcomingMajlis = userMajlis.filter(majlis => {
    if (!majlis.start_date) return false;
    const majlisDate = new Date(majlis.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return majlisDate >= today;
  }).length;
  const completedMajlis = totalMajlis - upcomingMajlis;

  const stats = [
    {
      title: 'Jumlah Majlis Saya',
      value: totalMajlis.toString(),
      icon: BarChart3
    },
    {
      title: 'Majlis Akan Datang',
      value: upcomingMajlis.toString(),
      icon: Clock
    },
    {
      title: 'Majlis Selesai',
      value: completedMajlis.toString(),
      icon: CheckCircle
    }
  ];

  return (
    <div className="min-h-screen px-6 py-8 bg-gray-50">
      <div className="container mx-auto">
        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-12 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-1">Admin Dashboard</h1>
          
          </div>
          <div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-gray-500 text-sm">Admin Account</p>
              <p className="text-emerald-600 font-semibold">{adminName}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl p-3 shadow-sm border border-gray-100 hover:shadow-lg hover:border-emerald-200 transition-all duration-500 transform hover:-translate-y-1 group"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1 rounded-2xl transition-all duration-300">
                  <stat.icon className="w-8 h-8 text-emerald-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1 leading-tight">
                {stat.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </p>
            </div>
          ))}
          
          {/* Add Majlis Card */}
          <Link
            to="/add-majlis"
            className="bg-emerald-600 hover:bg-emerald-700 rounded-3xl p-3 transition-all duration-500 transform hover:-translate-y-1 hover:shadow-lg group text-center flex flex-col items-center justify-center min-h-[130px]"
          >
            <div className="p-4 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-all duration-300 mb-2">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-white text-medium font-medium">
              Tambah Majlis
            </h3>
          </Link>
        </div>

        {/* Recent Majlis */}
        <div className="grid lg:grid-cols-1 gap-8">
          {/* Recent Majlis */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 w-full mx-auto">
            <div className="flex items-center mb-6">
              <div className="p-2 rounded-xl mr-3">
                <img src="/kubahnew.png" alt="kubahnew.png" className="w-6 h-6" />
              </div>
              <h2 className="text-medium font-bold text-gray-900">All Majlis</h2>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading majlis...</p>
                </div>
              ) : userMajlis.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Speaker</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Audience</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Actions</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userMajlis.map((majlis) => {
                      const isUpcoming = majlis.date && new Date(majlis.date) >= new Date();
                      return (
                        <tr key={majlis.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-900 text-sm">{majlis.title}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-gray-700 text-sm">{majlis.speaker}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {majlis.category && majlis.category.split(', ').map((cat: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-gray-700 text-sm">
                              {majlis.start_date && new Date(majlis.start_date).toLocaleDateString('ms-MY', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-gray-700 text-sm">{majlis.time}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-gray-700 text-sm">
                              {(() => {
                                const { primaryLocation, secondaryAddress } = parseLocationDisplay(majlis);
                                
                                if (primaryLocation) {
                                  return (
                                    <>
                                      <div className="font-medium text-gray-900">
                                        {primaryLocation}
                                      </div>
                                      {secondaryAddress && (
                                        <div className="text-gray-500 text-xs mt-0.5">{secondaryAddress}</div>
                                      )}
                                    </>
                                  );
                                } else {
                                  return <span className="text-gray-400 text-xs">No location</span>;
                                }
                              })()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-gray-700 text-sm">{majlis.audience}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center space-x-2">
                              {majlis.poster_url && (
                                <button
                                  onClick={() => {
                                    // Create modal or popup to show poster
                                    const modal = document.createElement('div');
                                    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
                                    const posterUrls = Array.isArray(majlis.poster_url) ? majlis.poster_url : [majlis.poster_url];
                                    const posterImages = posterUrls.map((url, index) => 
                                      url ? `
                                        <img src="${url}" alt="Majlis Poster ${index + 1}" class="max-w-full max-h-[200px] object-contain rounded-lg mx-auto mb-3" />
                                      ` : `
                                        <div class="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-3 flex items-center justify-center">
                                          <span class="text-2xl">🖼️</span>
                                        </div>
                                        <p class="text-gray-600 font-medium mb-2">${url || 'No poster uploaded'}</p>
                                      `
                                    ).join('');
                                    modal.innerHTML = `
                                      <div class="bg-white rounded-2xl p-6 max-w-2xl max-h-[90vh] overflow-auto">
                                        <div class="flex justify-between items-center mb-4">
                                          <h3 class="text-xl font-bold text-gray-900">Poster${posterUrls.length > 1 ? 's' : ''}: ${majlis.title}</h3>
                                          <button class="text-gray-500 hover:text-gray-700 text-2xl" onclick="this.closest('.fixed').remove()">&times;</button>
                                        </div>
                                        <div class="text-center">
                                          <div class="bg-gray-100 rounded-xl p-4 mb-4 min-h-[300px] flex items-center justify-center">
                                            <div class="text-center w-full space-y-4">
                                              ${posterImages}
                                              ${posterUrls.length > 1 ? `<p class="text-sm text-gray-600">${posterUrls.length} poster${posterUrls.length > 1 ? 's' : ''} uploaded</p>` : ''}
                                            </div>
                                          </div>
                                          <div class="text-left space-y-2 text-sm text-gray-600">
                                            <p><strong>Speaker:</strong> ${majlis.speaker}</p>
                                            <p><strong>Category:</strong> ${majlis.category}</p>
                                            <p><strong>Date:</strong> ${majlis.start_date} at ${majlis.time}</p>
                                            ${(() => {
                                              const { primaryLocation, secondaryAddress } = parseLocationDisplay(majlis);
                                              if (primaryLocation) {
                                                return `<p><strong>Location:</strong></p><p class="font-medium">${primaryLocation}</p>${secondaryAddress ? `<p class="text-sm text-gray-600">${secondaryAddress}</p>` : ''}`;
                                              } else {
                                                return '';
                                              }
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    `;
                                    document.body.appendChild(modal);
                                    modal.addEventListener('click', (e) => {
                                      if (e.target === modal) modal.remove();
                                    });
                                  }}
                                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                                  title="View poster"
                                >
                                  📷
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  handleEditMajlis(majlis);
                                }}
                                className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                                title="Edit majlis"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to delete "${majlis.title}"?`)) {
                                    try {
                                      const { error } = await database.deleteMajlis(majlis.id);
                                      if (error) {
                                        alert(`Error deleting majlis: ${error.message}`);
                                      } else {
                                        // Refresh the list
                                        const { data } = await database.getMajlisByUser();
                                        if (data) setUserMajlis(data);
                                      }
                                    } catch (err) {
                                      alert('Failed to delete majlis');
                                    }
                                  }
                                }}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                                title="Delete majlis"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-center">
                              <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                                (majlis.start_date && new Date(majlis.start_date) >= new Date()) ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {(majlis.start_date && new Date(majlis.start_date) >= new Date()) ? 'Upcoming' : 'Completed'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No majlis created yet</p>
                  <Link 
                    to="/add-majlis"
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Create your first majlis
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditMajlisModal
        majlis={editingMajlis}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onUpdate={handleUpdateMajlis}
      />
    </div>
  );
};

export default AdminDashboard;