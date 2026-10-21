import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.message) {
      // Surface which field failed validation, not just "Validation failed".
      const details = data.errors as { path?: string; message?: string }[] | undefined;
      if (Array.isArray(details) && details.length > 0) {
        const fields = details
          .map((d) => (d.path ? `${d.path}: ${d.message}` : d.message))
          .filter(Boolean)
          .join('; ');
        return fields ? `${data.message} (${fields})` : data.message;
      }
      return data.message;
    }
    return error.message;
  }
  return 'Something went wrong';
}

/** Uploads a single file and returns its server-relative URL. */
export async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/uploads', form);
  return res.data.data.url as string;
}
