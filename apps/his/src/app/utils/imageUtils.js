/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Utility function to compress and resize images before converting to Data URL.
 * Prevents localStorage QuotaExceededError and optimizes web app performance.
 */
export const compressAndResizeImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.85) => {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('فایل انتخاب‌شده تصویر نیست. لطفاً یک فایل تصویری (JPG, PNG, WEBP) انتخاب کنید.'));
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر.'));
        reader.onload = (event) => {
            const img = new Image();
            img.onerror = () => reject(new Error('تصویر انتخاب شده قابل پردازش نیست.'));
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                // Calculate aspect ratio and fit into maxWidth x maxHeight
                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, width);
                canvas.height = Math.max(1, height);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('مرورگر امکان پردازش و فشرده‌سازی تصویر را ندارد.'));
                    return;
                }
                // Fill white background for transparent PNGs
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Smooth image scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Export compressed JPEG / PNG
                const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const dataUrl = canvas.toDataURL(mimeType, quality);
                const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
                resolve({ dataUrl, sizeKb });
            };
            img.src = event.target?.result;
        };
        reader.readAsDataURL(file);
    });
};
