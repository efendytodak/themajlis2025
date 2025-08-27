// Haversine formula to calculate distance between two points on Earth
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

// Filter majlis by distance from user location
export const filterMajlisByDistance = (
  majlisList: any[],
  userLatitude: number,
  userLongitude: number,
  maxDistance: number = 50 // Default 50km radius
): any[] => {
  return majlisList
    .map(majlis => {
      // Skip majlis without coordinates
      if (!majlis.latitude || !majlis.longitude) {
        return { ...majlis, distance: null };
      }
      
      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        majlis.latitude,
        majlis.longitude
      );
      
      return { ...majlis, distance };
    })
    .filter(majlis => majlis.distance === null || majlis.distance <= maxDistance)
    .sort((a, b) => {
      // Sort by distance (null distances go to end)
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
};

// Get user-friendly distance text
export const getDistanceText = (distance: number | null): string => {
  if (distance === null) return '';
  if (distance < 1) return `${Math.round(distance * 1000)}m away`;
  return `${distance}km away`;
};