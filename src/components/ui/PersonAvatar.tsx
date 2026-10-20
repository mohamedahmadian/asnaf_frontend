import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { getImageUrl } from '../../lib/api'

/** عکس پرسنلی کوچک کنار نام در جدول‌ها؛ بدون عکس یا خطای لود، آیکون شخص */
export function PersonAvatar({ photoId }: { photoId?: string | null }) {
  const [failedPhotoId, setFailedPhotoId] = useState<string | null>(null)
  const photoUrl = photoId && photoId !== failedPhotoId ? getImageUrl(photoId) : null
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          draggable={false}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailedPhotoId(photoId ?? null)}
        />
      ) : (
        <UserRound className="size-5" aria-hidden />
      )}
    </span>
  )
}
