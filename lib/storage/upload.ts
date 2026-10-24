import { createClient as createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * Uploads an error screenshot file to the 'error-screenshots' bucket in Supabase Storage
 * and returns the public URL. Falls back to a localized Data URL if Supabase is unconfigured.
 */
export async function uploadErrorScreenshot(file: File): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const client = createBrowserSupabaseClient()
      if (client) {
        const fileExt = file.name.split('.').pop() || 'png'
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
        const filePath = `uploads/${fileName}`

        const { data, error } = await client.storage
          .from('error-screenshots')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (!error && data) {
          const { data: publicUrlData } = client.storage
            .from('error-screenshots')
            .getPublicUrl(filePath)

          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl
          }
        }
      }
    } catch (err) {
      console.warn('Supabase storage upload failed, converting to local preview URL:', err)
    }
  }

  // Fallback: convert file to Base64 data URL for instant rendering and storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read screenshot file as data URL'))
      }
    }
    reader.onerror = () => reject(new Error('Screenshot file read error'))
    reader.readAsDataURL(file)
  })
}
