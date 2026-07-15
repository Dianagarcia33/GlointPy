export const compressImage = async (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> => {
    // Si no es una imagen (ej. PDF), la devolvemos tal cual
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calcular nuevas dimensiones manteniendo el aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return resolve(file); // Fallback si no hay contexto 2D
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            return resolve(file); // Fallback
                        }
                        // Crear nuevo archivo comprimido
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };
            
            img.onerror = (error) => {
                console.error("Error cargando imagen para compresión:", error);
                resolve(file); // Fallback al archivo original
            };
        };
        
        reader.onerror = (error) => {
            console.error("Error leyendo archivo:", error);
            resolve(file); // Fallback al archivo original
        };
    });
};
