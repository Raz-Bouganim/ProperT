export interface FileWithPreview extends File {
  preview?: string;
}

export interface UploadError {
  file: string;
  message: string;
}

export interface MediaUploadResult {
  urls: string[];
  errors: UploadError[];
}
