'use client';
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function ImageUpload({
  label,
  currentImage,
  onImageChange,
  isCover = false
}) {
  const [previewUrl, setPreviewUrl] = useState(currentImage || null)

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(file)
      onImageChange(file)
    }
  }

  const handleRemoveImage = () => {
    setPreviewUrl(null)
    onImageChange(null)
  }

  return (
    (<div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(' ', '-')}>{label}</Label>
      <div className={`flex ${isCover ? 'flex-col' : 'items-center'} space-y-2`}>
        {previewUrl && (
          <div className={isCover ? 'w-full h-40 relative' : 'w-16 h-16 relative'}>
            <img
              src={previewUrl || "/placeholder.svg"}
              alt={label}
              className={`${isCover ? 'w-full h-full object-cover' : 'w-16 h-16 rounded-full object-cover'}`} />
          </div>
        )}
        <div className="flex space-x-2">
          <input
            type="file"
            id={label.toLowerCase().replace(' ', '-')}
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden" />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById(label.toLowerCase().replace(' ', '-'))?.click()}>
            {previewUrl ? 'Change Image' : 'Upload Image'}
          </Button>
          {previewUrl && (
            <Button type="button" variant="destructive" onClick={handleRemoveImage}>
              Remove Image
            </Button>
          )}
        </div>
      </div>
    </div>)
  );
}

