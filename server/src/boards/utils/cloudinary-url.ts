export function publicIdFromUrl(
  url: unknown,
  folderPrefix: string,
): string | null {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;

  if (typeof url !== 'string' || !cloud) return null;
  if (!url.startsWith(`https://res.cloudinary.com/${cloud}/`)) return null;

  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  const rest = url.slice(idx + marker.length).split('?')[0];

  // [transformations/]v123/folder/name.ext
  const match = rest.match(/^(?:.*?\/)?v\d+\/(.+)$/);
  if (!match) return null;

  const publicId = match[1].replace(/\.[^./]+$/, '');

  return publicId.startsWith(folderPrefix) ? publicId : null;
}
