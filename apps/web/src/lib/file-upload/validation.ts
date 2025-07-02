export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  default: 10 * 1024 * 1024, // 10MB
};

export const ALLOWED_FILE_TYPES = {
  image: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  document: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['.pdf', '.doc', '.docx'],
  },
  spreadsheet: {
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['.xls', '.xlsx'],
  },
  all: {
    mimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
    ],
  },
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileSize(
  file: File,
  category: keyof typeof FILE_SIZE_LIMITS = 'default'
): FileValidationResult {
  const maxSize = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.default;

  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

export function validateFileType(
  file: File,
  category: keyof typeof ALLOWED_FILE_TYPES = 'all'
): FileValidationResult {
  const allowedTypes = ALLOWED_FILE_TYPES[category] || ALLOWED_FILE_TYPES.all;

  // Check MIME type
  if (!allowedTypes.mimeTypes.includes(file.type)) {
    // Also check file extension as fallback
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedTypes.extensions.some((ext) => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.extensions.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

export function validateFile(
  file: File,
  options?: {
    category?: keyof typeof ALLOWED_FILE_TYPES;
    maxSize?: number;
  }
): FileValidationResult {
  const category = options?.category || 'all';

  // Validate file type
  const typeValidation = validateFileType(file, category);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  // Determine size category based on file type
  let sizeCategory: keyof typeof FILE_SIZE_LIMITS = 'default';
  if (file.type.startsWith('image/')) {
    sizeCategory = 'image';
  } else if (
    file.type.includes('pdf') ||
    file.type.includes('word') ||
    file.type.includes('document')
  ) {
    sizeCategory = 'document';
  }

  // Use custom max size if provided
  if (options?.maxSize) {
    if (file.size > options.maxSize) {
      const maxSizeMB = options.maxSize / (1024 * 1024);
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      };
    }
    return { valid: true };
  }

  // Otherwise use default validation
  return validateFileSize(file, sizeCategory);
}

export function sanitizeFileName(fileName: string): string {
  // Remove any path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');

  // Remove special characters except for dots, dashes, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.-_]/g, '_');

  // Ensure the file has a valid extension
  const lastDot = sanitized.lastIndexOf('.');
  if (lastDot === -1) {
    sanitized += '.unknown';
  }

  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.substring(lastDot);
    const nameWithoutExt = sanitized.substring(0, lastDot);
    sanitized = nameWithoutExt.substring(0, 255 - extension.length) + extension;
  }

  return sanitized;
}

export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const sanitized = sanitizeFileName(originalName);
  const lastDot = sanitized.lastIndexOf('.');

  if (lastDot === -1) {
    return `${timestamp}_${randomString}_${sanitized}`;
  }

  const nameWithoutExt = sanitized.substring(0, lastDot);
  const extension = sanitized.substring(lastDot);

  return `${timestamp}_${randomString}_${nameWithoutExt}${extension}`;
}
