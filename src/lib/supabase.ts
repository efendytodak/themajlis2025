import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check for missing or placeholder environment variables
const isValidConfig = supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your_supabase') && 
  !supabaseAnonKey.includes('your_supabase') && 
  !supabaseUrl.includes('YOUR_SUPABASE') && 
  !supabaseAnonKey.includes('YOUR_SUPABASE') &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co')

if (!isValidConfig) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
  console.error('Please replace the placeholder values in .env with your actual Supabase credentials')
  console.error('VITE_SUPABASE_URL should start with https:// and end with .supabase.co')
  console.error('Current VITE_SUPABASE_URL:', supabaseUrl || 'undefined')
  console.error('Current VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '[REDACTED]' : 'undefined')
}

// Only create client if we have valid environment variables
export const supabase = isValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured. Please check your environment variables.' } }
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured. Please check your environment variables.' } }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signOut: async () => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured. Please check your environment variables.' } }
    }
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: async () => {
    if (!supabase) {
      return { user: null, error: { message: 'Supabase not configured. Please check your environment variables.' } }
    }
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  }
}

// Database helper functions
export const database = {
  // Majlis operations
  createMajlis: async (majlisData: {
    title: string
    speaker?: string
    category?: string
    address?: string
    city?: string
    state?: string
    latitude?: number | null
    longitude?: number | null
    start_date: string
    end_date: string
    time?: string
    audience?: string
    poster_files?: File[]
    venue?: string
  }) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Check if user is authenticated
    if (userError || !user || !user.id) {
      return { 
        data: null, 
        error: { message: 'User must be authenticated to create majlis' } 
      }
    }

    // Ensure user exists in users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userCheckError || !existingUser) {
      // Create user profile if it doesn't exist
      const { error: createUserError } = await supabase
        .from('users')
        .insert([{
          id: user.id,
          email: user.email,
          role: 'admin'
        }])
      
      if (createUserError) {
        return { 
          data: null, 
          error: { message: 'Failed to create user profile' } 
        }
      }
    }

    let uploadedPosterUrls: string[] = []
    if (majlisData.poster_files && majlisData.poster_files.length > 0) {
      for (const file of majlisData.poster_files) {
        const { data: publicUrl, error: uploadError } = await database.uploadPoster(file)
        if (uploadError) {
          return { data: null, error: { message: `Failed to upload poster: ${uploadError.message}` } }
        }
        if (publicUrl) {
          uploadedPosterUrls.push(publicUrl)
        }
      }
    }

    // Prepare data for insertion, excluding poster_files and adding poster_url
    const { poster_files, ...restMajlisData } = majlisData;
    const dataToInsert = {
      ...restMajlisData,
      created_by: user?.id,
      poster_url: uploadedPosterUrls.length > 0 ? uploadedPosterUrls : null, // Store array of URLs
    }

    const { data, error } = await supabase
      .from('majlis')
      .insert([dataToInsert])
      .select('*, latitude, longitude')
    
    return { data, error }
  },

  getMajlisByUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('majlis')
      .select('*')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  getAllMajlis: async () => {
    // Get all majlis (filtering will be done on the frontend to account for time)
    
    if (!supabase) {
      return { data: [], error: { message: 'Supabase not configured. Please check your environment variables.' } }
    }
    
    try {
      const { data, error } = await supabase
        .from('majlis')
        .select('*, latitude, longitude')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.warn('Database error fetching majlis:', error.message)
        return { data: [], error }
      }
      
      return { data, error }
    } catch (networkError: any) {
      // Handle network/CORS errors
      if (networkError.message?.includes('Failed to fetch') || 
          networkError.message?.includes('NetworkError') ||
          networkError.name === 'TypeError') {
        console.warn('Network error fetching majlis. This may be due to CORS configuration or network connectivity issues.')
        console.warn('Please check your Supabase CORS settings and ensure your domain is allowed.')
        return { data: [], error: { message: 'Network connection error. Please check your internet connection and try again.' } }
      }
      
      console.error('Unexpected error fetching majlis:', networkError)
      return { data: [], error: { message: 'An unexpected error occurred while fetching data.' } }
    }
  },

  updateMajlis: async (id: string, updates: any) => {
    let newUploadedPosterUrls: string[] = []
    if (updates.poster_files && updates.poster_files.length > 0) {
      for (const file of updates.poster_files) {
        const { data: publicUrl, error: uploadError } = await database.uploadPoster(file)
        if (uploadError) {
          return { data: null, error: { message: `Failed to upload poster: ${uploadError.message}` } }
        }
        if (publicUrl) {
          newUploadedPosterUrls.push(publicUrl)
        }
      }
      // If new files are uploaded, replace existing poster_url
      updates.poster_url = newUploadedPosterUrls.length > 0 ? newUploadedPosterUrls : null
    }
    // Remove poster_files from updates object before sending to DB
    const { poster_files, ...updatesToApply } = updates

    const { data, error } = await supabase
      .from('majlis')
      .update(updatesToApply)
      .eq('id', id)
      .select('*, latitude, longitude')
    
    return { data, error }
  },

  deleteMajlis: async (id: string) => {
    const { data, error } = await supabase
      .from('majlis')
      .delete()
      .eq('id', id)
    
    return { data, error }
  },

  getCurrentUserRole: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: { message: 'No authenticated user' } }
    }

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    return { data: data?.role || null, error }
  },

  toggleMajlisLike: async (majlisId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: { message: 'User must be authenticated to like majlis' } }
    }

    // Get current majlis data
    const { data: majlis, error: fetchError } = await supabase
      .from('majlis')
      .select('like_count, liked_by')
      .eq('id', majlisId)
      .single()

    if (fetchError) {
      return { data: null, error: fetchError }
    }

    const likedBy = majlis.liked_by || []
    const userHasLiked = likedBy.includes(user.id)
    
    let newLikeCount = majlis.like_count || 0
    let newLikedBy = [...likedBy]

    if (userHasLiked) {
      // Unlike: remove user from liked_by and decrease count
      newLikedBy = likedBy.filter((id: string) => id !== user.id)
      newLikeCount = Math.max(0, newLikeCount - 1)
    } else {
      // Like: add user to liked_by and increase count
      newLikedBy.push(user.id)
      newLikeCount = newLikeCount + 1
    }

    // Update the majlis
    const { data, error } = await supabase
      .from('majlis')
      .update({
        like_count: newLikeCount,
        liked_by: newLikedBy
      })
      .eq('id', majlisId)
      .select()

    return { 
      data: data ? { 
        ...data[0], 
        userHasLiked: !userHasLiked,
        like_count: newLikeCount 
      } : null, 
      error 
    }
  },

  checkUserLikedMajlis: async (majlisId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: false, error: null }
    }

    const { data: majlis, error } = await supabase
      .from('majlis')
      .select('liked_by')
      .eq('id', majlisId)
      .single()

    if (error) {
      return { data: false, error }
    }

    const likedBy = majlis.liked_by || []
    return { data: likedBy.includes(user.id), error: null }
  },

  getAllUsers: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  updateUserRole: async (userId: string, role: string) => {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
    
    return { data, error }
  },

  getUserRoleById: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    
    return { data: data?.role || null, error }
  },

  uploadPoster: async (file: File) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured. Please check your environment variables.' } }
    }
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { data: null, error: { message: 'User must be authenticated to upload files' } }
    }
    
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const filePath = fileName; // Remove public/ prefix as getPublicUrl adds it automatically

    const { data, error } = await supabase.storage
      .from('eventposters') // Your bucket name
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Set to true if you want to overwrite existing files with the same name
      });

    if (error) {
      console.error('Error uploading poster:', error);
      // Provide more specific error messages
      if (error.message.includes('row-level security policy')) {
        return { 
          data: null, 
          error: { 
            message: 'Storage permissions not configured. Please contact administrator to set up file upload permissions.' 
          } 
        };
      }
      return { data: null, error: { message: `Upload failed: ${error.message}` } };
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('eventposters')
      .getPublicUrl(filePath);

    return { data: publicUrlData.publicUrl, error: null };
  },

  getMajlisStats: async () => {
    const { data: allMajlis, error } = await supabase
      .from('majlis')
      .select('*')
    
    if (error) {
      return { data: null, error }
    }

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const upcoming = allMajlis?.filter(m => {
      if (!m.start_date) return false
      const eventDate = new Date(m.start_date)
      return eventDate >= now
    }).length || 0

    const completed = (allMajlis?.length || 0) - upcoming

    const thisMonth = allMajlis?.filter(m => {
      if (!m.created_at) return false
      const createdDate = new Date(m.created_at)
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
    }).length || 0

    const categoryStats = allMajlis?.reduce((acc: Record<string, number>, majlis) => {
      const category = majlis.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {}) || {}

    return {
      data: {
        total: allMajlis?.length || 0,
        upcoming,
        completed,
        thisMonth,
        categories: categoryStats
      },
      error: null
    }
  }
}
