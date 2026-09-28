import { useMutation } from '@tanstack/react-query'
import { uploadService } from '@/services/upload.service'
import { useInvalidateJobs } from './useJobs'

// All upload endpoints write job rows/documents → refresh job queries afterwards.
export function useUpload<T = unknown>(kind: 'upload' | 'submit') {
  const invalidate = useInvalidateJobs()
  return useMutation({ mutationFn: (form: FormData) => uploadService[kind]<T>(form), onSuccess: invalidate })
}

// /upload/process only parses the file; nothing to invalidate.
export function useUploadProcess<T = unknown>() {
  return useMutation({ mutationFn: (form: FormData) => uploadService.process<T>(form) })
}
