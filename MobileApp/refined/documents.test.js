import {documentName, freshDocumentUrl, savedDocuments} from './documents';

const docLink = (id, token) =>
  `https://api.cloudinary.com/v1_1/example/raw/download?public_id=${encodeURIComponent(
    id,
  )}&signature=${token}`;

test('matches an owned document by its stable ID across signed link renewals', async () => {
  const id = 'documents/farm-paperwork-1234567890123.pdf';
  const original = docLink(id, 'old');
  const fresh = docLink(id, 'new');
  const other = docLink('documents/other.pdf', 'other');
  const refresh = jest.fn().mockResolvedValue({documents: [other, fresh]});
  expect(savedDocuments({documents: [original]})).toEqual([id]);
  expect(documentName(id)).toBe('farm-paperwork.pdf');
  await expect(freshDocumentUrl(refresh, id)).resolves.toBe(fresh);
  await expect(freshDocumentUrl(refresh, 'missing.pdf')).rejects.toThrow(
    'no longer available',
  );
});
