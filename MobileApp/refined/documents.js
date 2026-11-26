export function isHttpsDocument(url) {
  return (
    typeof url === 'string' &&
    /^https:\/\/[^\s/?#@]+(?:[/?#][^\s]*)?$/.test(url)
  );
}

export function documentId(url) {
  if (!isHttpsDocument(url)) {
    return null;
  }
  const publicId = /[?&]public_id=([^&#]+)/.exec(url)?.[1];
  try {
    return publicId
      ? decodeURIComponent(publicId.replace(/\+/g, ' '))
      : url.split(/[?#]/)[0];
  } catch {
    return null;
  }
}

export const documentName = id =>
  id
    ?.split('/')
    .pop()
    ?.replace(/-\d{10,}(?=\.pdf$|$)/, '') || 'Farm document.pdf';

export function savedDocuments(user) {
  if (!Array.isArray(user?.documents)) {
    return [];
  }
  return Array.from(new Set(user.documents.map(documentId).filter(Boolean)));
}

export async function freshDocumentUrl(refreshProfile, id) {
  const profile = await refreshProfile();
  const url = Array.isArray(profile.documents)
    ? profile.documents.find(candidate => documentId(candidate) === id)
    : null;
  if (!url) {
    throw new Error('This document is no longer available on your account.');
  }
  return url;
}
