/**
 * Utility to read an uploaded image file from the user's device,
 * center-crop and resize it to a crisp square (default 256x256),
 * and compress it as a lightweight JPEG/WebP Data URL (~15-30KB)
 * so it syncs instantaneously with localStorage, API, and Supabase.
 */
export async function processAvatarImageFile(
  file: File,
  maxDimension: number = 256,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP, GIF).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Dữ liệu hình ảnh trống.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Tệp hình ảnh bị lỗi hoặc không được hỗ trợ.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = maxDimension;
          canvas.height = maxDimension;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Fill white background in case of transparent PNG converted to JPEG
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, maxDimension, maxDimension);

          // Center-crop square from source image
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          ctx.drawImage(
            img,
            sx,
            sy,
            minSide,
            minSide,
            0,
            0,
            maxDimension,
            maxDimension
          );

          // Try WebP first for best quality-to-size ratio, fallback to JPEG
          let compressed = canvas.toDataURL('image/webp', quality);
          if (!compressed.startsWith('data:image/webp')) {
            compressed = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(compressed);
        } catch (err) {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}

export const PRESET_STUDENT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
];

export const PRESET_TEACHER_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherLan',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherMinh',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherHoa',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherTuan',
];
