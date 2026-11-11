import { http, notifyError } from './client';
export async function downloadArtifact(path?: string) {
  if (!path) {
    notifyError(null, 'There was a problem');
    return;
  }
  try {
    const url = new URL(path, location.origin);
    const response = await http.get<Blob>(url.href, {
      responseType: 'blob',
      withCredentials: url.origin === location.origin,
    });
    const objectUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download =
      url.searchParams.get('fileName') ||
      url.pathname.split('/').pop() ||
      'download';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    notifyError(error);
  }
}
